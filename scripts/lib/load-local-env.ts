import { existsSync } from 'node:fs'
import { loadEnvFile } from 'node:process'

// Node does not load .env automatically for tsx scripts. Existing CI variables
// take precedence; this file is optional for scheduled runs.
if (existsSync('.env')) loadEnvFile('.env')
