-- ═══════════════════════════════════════════════════════════════
-- EucalyptusEye — Schema Supabase / PostgreSQL
-- Corre este script no SQL Editor do teu projecto Supabase.
-- Requer a extensão PostGIS (activada por defeito no Supabase).
-- ═══════════════════════════════════════════════════════════════

-- ── 0. Extensões ──────────────────────────────────────────────
-- PostGIS já está activo no Supabase; este comando é idempotente.
CREATE EXTENSION IF NOT EXISTS postgis;

-- ── 1. Tabela principal ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.diagnosticos (
  -- Identificador: aceita UUIDs v4 gerados pelo cliente (offline)
  -- ou pelo Supabase (gen_random_uuid) quando online.
  id            TEXT        PRIMARY KEY,

  -- Utilizador autenticado (Supabase Auth)
  user_id       UUID        NOT NULL
                            REFERENCES auth.users(id) ON DELETE CASCADE,

  -- URL pública da imagem no Supabase Storage
  image_url     TEXT,

  -- Localização geográfica (PostGIS POINT, SRID 4326 = WGS 84)
  -- Permite queries espaciais: ST_DWithin, ST_Distance, etc.
  location      GEOMETRY(Point, 4326),

  -- Texto WKT enviado pelo cliente (ex: "POINT(-8.654 40.640)")
  -- Convertido para `location` pelo trigger abaixo.
  location_wkt  TEXT,

  -- Data/hora da captura no dispositivo (ISO 8601)
  captured_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Data/hora em que o registo entrou na base de dados
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Estado do ciclo de vida do diagnóstico
  status        TEXT        NOT NULL DEFAULT 'pendente'
                            CHECK (status IN ('pendente', 'analisado', 'erro')),

  -- Resultado devolvido pela Edge Function (Gemini)
  -- Exemplo de estrutura JSON:
  -- {
  --   "especie": "Eucalyptus globulus",
  --   "saude": "praga",
  --   "pragas": ["Gonipterus platensis"],
  --   "confianca": 0.91,
  --   "recomendacao": "Aplicar tratamento fitossanitário na zona norte.",
  --   "modelo": "gemini-2.5-flash",
  --   "chave_usada": 2
  -- }
  resultado_ia  JSONB
);

-- ── 2. Índices ─────────────────────────────────────────────────

-- Pesquisa por utilizador (lista de diagnósticos do técnico)
CREATE INDEX IF NOT EXISTS idx_diagnosticos_user
  ON public.diagnosticos (user_id);

-- Pesquisa por estado (fila de trabalho da Edge Function)
CREATE INDEX IF NOT EXISTS idx_diagnosticos_status
  ON public.diagnosticos (status);

-- Índice espacial GIST para queries de mapa (Leaflet + PostGIS)
CREATE INDEX IF NOT EXISTS idx_diagnosticos_location
  ON public.diagnosticos USING GIST (location);

-- ── 3. Trigger: WKT → geometry ────────────────────────────────
-- Converte o texto "POINT(lon lat)" enviado pelo cliente para o
-- tipo nativo geometry antes de inserir/actualizar.

CREATE OR REPLACE FUNCTION public.set_location_from_wkt()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.location_wkt IS NOT NULL AND NEW.location IS NULL THEN
    BEGIN
      NEW.location := ST_SetSRID(
        ST_GeomFromText(NEW.location_wkt),
        4326
      );
    EXCEPTION WHEN OTHERS THEN
      -- Se o WKT for inválido, ignora (location fica NULL)
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_location ON public.diagnosticos;
CREATE TRIGGER trg_set_location
  BEFORE INSERT OR UPDATE ON public.diagnosticos
  FOR EACH ROW EXECUTE FUNCTION public.set_location_from_wkt();

-- ── 4. Row Level Security (RLS) ────────────────────────────────
-- Cada técnico só vê e edita os seus próprios registos.

ALTER TABLE public.diagnosticos ENABLE ROW LEVEL SECURITY;

-- Leitura: apenas os registos do próprio utilizador
CREATE POLICY "leitura_propria" ON public.diagnosticos
  FOR SELECT
  USING (auth.uid() = user_id);

-- Inserção: só pode criar registos com o seu user_id
CREATE POLICY "insercao_propria" ON public.diagnosticos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Actualização: só pode modificar os seus registos
CREATE POLICY "atualizacao_propria" ON public.diagnosticos
  FOR UPDATE
  USING (auth.uid() = user_id);

-- A Edge Function usa a service_role key → ignora RLS por design.

-- ── 5. Supabase Storage — bucket ──────────────────────────────
-- Cria o bucket via SQL (alternativa ao Dashboard).

INSERT INTO storage.buckets (id, name, public)
VALUES ('eucalyptus-images', 'eucalyptus-images', true)
ON CONFLICT (id) DO NOTHING;

-- Política de storage: o técnico só faz upload para a sua pasta
CREATE POLICY "upload_propria_pasta" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'eucalyptus-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Leitura pública (para o Leaflet carregar as imagens nos pins)
CREATE POLICY "leitura_publica_imagens" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'eucalyptus-images');

-- ── 6. View auxiliar para o Mapa (Leaflet) ────────────────────
-- Retorna só as colunas necessárias para renderizar os pins,
-- incluindo longitude/latitude extraídas do geometry.

CREATE OR REPLACE VIEW public.v_mapa_diagnosticos AS
SELECT
  d.id,
  d.user_id,
  d.image_url,
  d.status,
  d.captured_at,
  ST_Y(d.location::geometry) AS latitude,
  ST_X(d.location::geometry) AS longitude,
  d.resultado_ia->>'saude'         AS saude,
  d.resultado_ia->>'especie'       AS especie,
  d.resultado_ia->>'recomendacao'  AS recomendacao
FROM public.diagnosticos d
WHERE d.location IS NOT NULL;

-- RLS na view: herda as políticas da tabela base.
-- ── FIM ───────────────────────────────────────────────────────
