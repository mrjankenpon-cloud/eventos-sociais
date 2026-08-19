/**
 * O painel DELPHOS não usa mais login por senha (controleadmin).
 * Cadastre Gmails em /controle/permissoes ou aprove pedidos enviados a
 * augustovogel82@gmail.com.
 */
console.log(
  [
    'Login por senha foi desativado.',
    'Acesso: somente Gmail.',
    'Pedidos sem permissão vão para augustovogel82@gmail.com.',
  ].join('\n')
);
process.exit(0);
