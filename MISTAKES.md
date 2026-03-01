# MISTAKES.md

## Mistake 1: Migration not run before testing auth
SQL schema files don't auto-execute — always run `npm run migrate` 
after creating any new migration file before testing endpoints.
Always add new migration files to src/db/migrations/ with 
incrementing prefix (002_, 003_) and re-run migrate script.


## Mistake 2: Assumed OpenAI was required for LLM
Always use Groq (console.groq.com) for free LLM API access 
during development and demo deployments. Model: llama-3.3-70b-versatile
