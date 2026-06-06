Para retomar o controle da navegação, aqui está o resumo prático de como o seu sistema de **Input** foi configurado em `js/core/Input.js` e como ele interage com o `main.js`:

### 🕹️ Comandos de Movimentação

O seu sistema alterna automaticamente entre dois modos (pressione **F** para trocar):

| Ação | Tecla | Modo Voo (Ativado por padrão) | Modo Terra (Com Gravidade) |
| --- | --- | --- | --- |
| **Frente** | `W` | Move para frente | Move para frente |
| **Trás** | `S` | Move para trás | Move para trás |
| **Esquerda** | `A` | Move para esquerda | Move para esquerda |
| **Direita** | `D` | Move para direita | Move para direita |
| **Subir / Pular** | `Espaço` | **Sobe** (Altitude) | **Pula** |
| **Descer** | `Shift` | **Desce** (Altitude) | *Sem função* |
| **Alternar Modo** | `F` | Alterna entre Voo/Terra | Alterna entre Voo/Terra |

---

### 🖱️ Controle de Câmera

Como o seu projeto usa `requestPointerLock()`:

1. **Clique na tela:** O jogo "prende" o seu mouse para que você possa girar a câmera livremente sem o cursor sair da janela.
2. **Mover o mouse:** Gira a câmera (olhar em volta).
3. **Para sair:** Pressione a tecla `ESC` no seu teclado; isso libera o ponteiro do mouse para que você possa clicar nos botões do painel lateral.

---

### 💡 Dicas importantes para o seu projeto atual:

* **Verifique o Foco:** Se você pressionou `ESC` para mexer no painel, lembre-se de clicar novamente dentro da área 3D (o canvas do jogo) para que o `PointerLock` seja reativado e o mouse volte a controlar a câmera.
* **Debug de Telemetria:** Fique de olho no HUD no canto superior direito. Se você estiver no **Modo Terra** e o personagem parar de se mover, verifique o campo `ALTITUDE`. Se estiver preso em um desnível muito alto, tente alternar para o **Modo Voo (`F`)** para se reposicionar.
* **Consoles:** Como você está trabalhando ativamente no código, se os comandos não responderem, abra o console do navegador (`F12`) para ver se não há algum erro de script bloqueando o `InputController`.

Se precisar alterar a sensibilidade do mouse ou a velocidade de voo, basta ajustar as constantes no seu arquivo `main.js` (nas seções de inicialização do loop `animate`). Precisa que eu ajuste algum desses valores para você agora?