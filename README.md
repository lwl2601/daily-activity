# Daily Activity (`daily-activity`)

Ferramenta automatizada para gerar entre **10 e 20 commits diários** em quantidade e horários aleatórios, além de preencher retroativamente (**backfill**) o gráfico de contribuições do GitHub.

## Como funciona

- **Quantidade variável por dia**: Sorteia criptograficamente entre `10` e `20` commits para cada dia.
- **Horários e mensagens aleatórias**: Distribui os timestamps ao longo do dia (`08:00` às `23:20` BRT) em ordem cronológica e alterna entre diferentes mensagens no padrão Conventional Commits.
- **Backfill ultrarrápido**: Para preencher os últimos 365 dias (~5.500 commits), utiliza `git fast-import`, gerando todo o histórico do ano em menos de 1 segundo.
- **Automação na nuvem (GitHub Actions)**: O workflow `.github/workflows/daily-commits.yml` roda todos os dias sozinho na nuvem, sem precisar deixar o computador ligado.

## Comandos locais

```bash
# Testar sem criar commits (dry-run)
npm run dry-run

# Gerar entre 10 e 20 commits para o dia de hoje
npm run daily

# Preencher os últimos 365 dias com 10 a 20 commits/dia
npm run backfill

# Rodar suíte de testes
npm test
```

## Publicando no GitHub

1. Crie um repositório no GitHub chamado `daily-activity` na conta `lwl2601` (pode ser **público** ou **privado** — se for privado, ative *"Private contributions"* no seu perfil do GitHub em *Contribution settings*).
2. Conecte e envie o histórico:
   ```bash
   git remote add origin https://github.com/lwl2601/daily-activity.git
   git push -u origin main
   ```
3. O GitHub Actions já ficará ativo automaticamente para rodar todos os dias (e também pode ser acionado manualmente na aba **Actions → Daily Activity Commits → Run workflow**).
