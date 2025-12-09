# Como Gerar o Executável (.exe)

Este projeto foi configurado para funcionar como uma aplicação Desktop Windows usando Electron.

## Pré-requisitos

1. **Node.js**: Certifique-se de ter o Node.js instalado (versão 18 ou superior).
2. **Drivers Biometria**: O Digital Persona Web SDK (o serviço local do Windows) deve estar instalado e rodando na máquina onde o .exe for executado.

## Passos para Instalar e Criar o Executável

1. **Instalar Dependências**:
   Abra o terminal na pasta do projeto e execute:
   ```bash
   npm install
   ```

2. **Testar em Modo de Desenvolvimento**:
   Para rodar o app no modo janela (Electron) sem gerar o executável ainda:
   ```bash
   npm run electron:dev
   ```

3. **Gerar o Instalador (.exe)**:
   Para criar o arquivo instalável final para distribuição:
   ```bash
   npm run electron:build
   ```

   Após o término do processo, o arquivo `.exe` estará localizado na pasta:
   `dist_electron/`

## Sobre a Biometria Offline

O sistema se comunica com o serviço local do Digital Persona (`https://127.0.0.1:52181`). 
Em alguns casos, o certificado SSL local auto-assinado pode ser bloqueado pelo Electron.
Se a biometria não conectar, verifique se o serviço "Digital Persona Web Services" está rodando no Windows Services.
