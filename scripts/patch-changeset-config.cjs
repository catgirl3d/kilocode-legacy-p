const fs = require("fs")

const configPath = ".changeset/config.json"
const repo = process.env.GITHUB_REPOSITORY

if (!repo) {
	console.error("GITHUB_REPOSITORY is not set")
	process.exit(1)
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"))

config.changelog = ["@changesets/changelog-github", { repo }]

fs.writeFileSync(configPath, `${JSON.stringify(config, null, "\t")}\n`)

console.log(`Patched ${configPath} changelog repo to ${repo}`)
