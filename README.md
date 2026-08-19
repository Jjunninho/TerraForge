# TerraForge
Mundo 3D Procedural

[![Estado](https://img.shields.io/badge/status-alpha-orange)](https://github.com/Jjunninho/TerraForge) [![Linguagens](https://img.shields.io/github/languages/top/Jjunninho/TerraForge)](https://github.com/Jjunninho/TerraForge) [![Licença](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Índice
- Sobre
- Demonstração
- Principais funcionalidades
- Tecnologias
- Instalação
- Como executar
- Configuração e parâmetros
- Desenvolvimento
- Contribuindo
- Roadmap
- Créditos
- Licença
- Contato

## Sobre
TerraForge é um projeto que gera mundos 3D de forma procedural usando tecnologias web (JavaScript/HTML/CSS). O objetivo é permitir exploração visual, experimentação com algoritmos de geração procedural (ruído, biomas, erosão, LOD) e servir como base para jogos, demos e ferramentas educativas.

## Demonstração
> Coloque aqui um GIF ou screenshot do projeto (ex.: `/assets/demo.gif` ou um link para uma página hospedada).

Se você tiver uma página hospedada (GitHub Pages), adicione o link aqui:
https://github.com/Jjunninho/TerraForge

## Principais funcionalidades
- Geração procedural de terreno (Perlin / Simplex / Voronoi)
- Sistema de biomas (áreas distintas por altitude/temperatura)
- Controles de navegação (câmera livre / orbit)
- Ajuste dinâmico de parâmetros (seed, escala, amplitude)
- Otimizações de performance (meshes, LOD básico)
- Exportação de screenshots / mapas de altura (opcional)

## Tecnologias
- JavaScript (ES6+)
- HTML5 / Canvas / WebGL (ex.: three.js)
- CSS para UI e controles

> Observação: o repositório é majoritariamente JavaScript/HTML/CSS.

## Instalação
Clone o repositório:

```bash
git clone https://github.com/Jjunninho/TerraForge.git
cd TerraForge
```

Opções para rodar localmente:
- Projeto estático (apenas abra `index.html` no navegador)
- Servidor simples (recomendado para evitar problemas de CORS):
  - Python 3:
    ```bash
    python -m http.server 8000
    # então abra http://localhost:8000
    ```
  - Node (se houver `package.json` e scripts):
    ```bash
    npm install
    npm start
    # ou
    npm run dev
    ```

## Como executar
1. Abra o navegador: `http://localhost:8000` (ou o endereço que o seu servidor fornecer).
2. Use os controles na tela ou as teclas listadas na UI para navegar pelo mundo.
3. Teste diferentes seeds e parâmetros para ver variações no terreno.

## Configuração e parâmetros
- `seed`: número inteiro para gerar mundos reproduzíveis.
- `scale`: controla o nível de detalhe do ruído.
- `amplitude`: altura máxima do terreno.
- `octaves`, `persistence`, `lacunarity`: parâmetros do gerador de ruído.

Observação: caso exista um arquivo `config` ou objeto `settings.js`, documente aqui as chaves e exemplos de valores.

## Desenvolvimento
- Estruture as features em módulos (gerador de ruído, gerador de malha, shader, UI).
- Adicione testes manuais para performance (medir fps em terrenos grandes).
- Se usar bundler (webpack, vite, parcel), inclua scripts `npm run build` e `npm run dev`.

Sugestão de workflow:
1. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
2. Faça commits pequenos e descritivos.
3. Abra Pull Request com descrição e screenshots.

## Contribuindo
Contribuições são bem-vindas! Por favor:
- Abra uma issue antes de iniciar trabalho grande para discutirmos a abordagem.
- Siga o padrão de commits (mensagens claras).
- Adicione documentação e exemplos para qualquer nova funcionalidade.
- Opcional: siga o padrão de código (prettier/eslint) se já estiver configurado.

Modelo básico:
- Fork → branch → commit → PR

## Roadmap
- [ ] Suporte a múltiplos biomas mais detalhados
- [ ] Efeitos atmosféricos (névoa, céu dinâmico)
- [ ] Erosão e sedimentação simuladas
- [ ] Exportar mapas de altura e normal maps
- [ ] Versão mobile/otimização

## Créditos
- Inspirado por técnicas de geração procedural (Perlin/Simplex/Voronoi).
- Biblioteca sugerida: three.js (se aplicável).

## Licença
Escolha uma licença para o projeto. Recomendo MIT para projetos open-source simples.

Exemplo de nota de licença:
Este projeto está licenciado sob a Licença MIT — veja o arquivo LICENSE para detalhes.

## Contato
Desenvolvedor: Jjunninho  
GitHub: https://github.com/Jjunninho

---

Se quiser que eu:
- crie um arquivo LICENSE (ex.: MIT) e adicione automaticamente, posso fazer isso;
- adicione screenshots/GIFs ao repositório e atualize o README para apontar para eles, envie as imagens ou caminhos;
- escreva uma versão em inglês do README, eu também posso gerar e commitar.
