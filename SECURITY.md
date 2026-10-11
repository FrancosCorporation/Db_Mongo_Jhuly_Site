# Segurança

Se encontrar uma vulnerabilidade, use a opção privada **Report a vulnerability**
na aba Security deste repositório. Inclua passos de reprodução e o impacto
observado; evite publicar detalhes exploráveis antes de uma correção.

Não envie senhas, tokens ou credenciais em issues públicas. Credenciais de
produção devem ficar nas variáveis de ambiente do provedor de deploy.
Senhas são limitadas a 72 bytes UTF-8 para respeitar o limite do bcrypt. O upload
de foto aceita uma parte de arquivo de até 5 MB, com cota por endereço IP.
Tokens protegidos exigem `sub` igual ao `userId` e um `exp` inteiro válido, além
da assinatura, emissor e público. O limite global inclui `/health`; login,
cadastro e upload têm cotas adicionais.
