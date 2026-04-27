# 🌿 PlantEye - Assistente Botânico Inteligente

> Um assistente de IA que usa Visão Computacional para analisar, diagnosticar e monitorizar a saúde das tuas plantas em tempo real.

![Status do Projeto](https://img.shields.io/badge/Status-Em%20Desenvolvimento-emerald)
![React](https://img.shields.io/badge/React-18.x-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?logo=tailwind-css)
![Google Gemini](https://img.shields.io/badge/AI-Google_Gemini-orange?logo=google)

---

## ✨ Funcionalidades Principais

* 📸 Diagnóstico Rápido (Modo Manual): Tira uma foto da tua planta e recebe um diagnóstico instantâneo contendo a espécie, estado de saúde (Saudável, Com Sede, Doente), nível de luz e recomendações de cuidados.
* 🔴 Monitoramento Vivo (Real-time): Conexão via WebSockets com o modelo gemini-2.5-flash-native-audio para análise contínua de vídeo e áudio em tempo real.
* 🔄 Seleção Inteligente de Câmara: Alterna facilmente entre a câmara frontal e traseira, com deteção automática da câmara principal do telemóvel.
* 🔊 Feedback por Voz: Leitura do diagnóstico em áudio, focado na acessibilidade visual.
* 🎨 UI/UX Premium: Interface limpa, responsiva e focada na experiência do utilizador, construída com Tailwind CSS.

---

## 🚀 Tecnologias Utilizadas

* Frontend: React.js, TypeScript
* Estilização: Tailwind CSS
* Ícones: Lucide React
* Inteligência Artificial: SDK Oficial @google/genai (Google Gemini Vision & Audio)
* Funcionalidades Nativas: navigator.mediaDevices para controlo de hardware da câmara.

---

## 🛠️ Instalação e Configuração Local

Para correres este projeto na tua máquina, segue estes passos:

1. Pré-requisitos
Certifica-te de que tens o Node.js (versão 18 ou superior) instalado e uma chave de API válida do Google Gemini (Google AI Studio).

2. Clonar o repositório
git clone https://github.com/joaopeccanha18/PlantEyeAI
cd planteye

3. Instalar dependências
npm install

4. Configurar as Variáveis de Ambiente
Cria um ficheiro .env na raiz do projeto e adiciona a tua chave da API do Gemini:
VITE_GEMINI_API_KEY=tua_chave_api_aqui

5. Iniciar o servidor de desenvolvimento
npm run dev

---

## 🤝 Contribuição

Contribuições são muito bem-vindas! Se tens uma ideia para melhorar o PlantEye:
1. Faz um Fork do projeto
2. Cria uma Branch para a tua funcionalidade (git checkout -b feature/MinhaFuncionalidade)
3. Faz o Commit das tuas alterações (git commit -m 'Adiciona MinhaFuncionalidade')
4. Faz o Push para a Branch (git push origin feature/MinhaFuncionalidade)
5. Abre um Pull Request

---

## 📝 Licença
Este projeto está sob a licença MIT. Sente-te livre para usá-lo e modificá-lo!

Feito com RedBull e muito código.
