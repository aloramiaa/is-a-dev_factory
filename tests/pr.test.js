const t = require("ava");
const fs = require("fs-extra");
const path = require("path");

const requiredEnvVars = ["PR_AUTHOR", "PR_AUTHOR_ID"];
const trustedUsers = require("../util/trusted.json").map((u) => u.id.toString());

function getDomainData(subdomain) {
    try {
        const data = fs.readJsonSync(path.join(path.resolve("domains"), `${subdomain}.json`));
        return data;
    } catch (error) {
        throw new Error(`Failed to read JSON for ${subdomain}: ${error.message}`);
    }
}

t("Users can only update their own subdomains", (t) => {
    if (requiredEnvVars.every((v) => process.env[v])) {
        const changedFiles = JSON.parse(process.env.CHANGED_FILES);
        const deletedFiles = JSON.parse(process.env.DELETED_FILES);
        const prAuthor = process.env.PR_AUTHOR.toLowerCase();
        const prAuthorId = process.env.PR_AUTHOR_ID;

        const changedJSONFiles = changedFiles
            .filter((file) => file.startsWith("domains/"))
            .map((file) => path.basename(file));
        const deletedJSONFiles = deletedFiles
            .filter((file) => file.name.startsWith("domains/"))
            .map((file) => path.basename(file.name));

        if ((!changedJSONFiles && !deletedFiles) || trustedUsers.includes(prAuthorId)) return t.pass();
        if (process.env.PR_LABELS && process.env.PR_LABELS.includes("ci: bypass-owner-check")) return t.pass();

        changedJSONFiles.forEach((file) => {
            const subdomain = file.replace(/\.json$/, "");
            const data = getDomainData(subdomain);

            t.true(
                data.owner.username.toLowerCase() === prAuthor,
                `${subdomain}: ${prAuthor} is not authorized to update ${subdomain}.is-a.dev`
            );
        });

        deletedJSONFiles.forEach((file) => {
            const subdomain = file.replace(/\.json$/, "");
            const data = JSON.parse(
                deletedFiles
                    .find((f) => f.name === `domains/${file}`)
                    .data.split("\n")
                    .filter((line) => line.startsWith("-") && !line.startsWith("---"))
                    .map((line) => line.substring(1))
                    .join("\n")
            );

            t.true(
                data.owner.username.toLowerCase() === prAuthor,
                `${file}: ${prAuthor} is not authorized to delete ${subdomain}.is-a.dev`
            );
        });
    }

    t.pass();
});

t("PRs for non-email domains must include a screenshot link", (t) => {
    if (requiredEnvVars.every((v) => process.env[v])) {
        const changedFiles = JSON.parse(process.env.CHANGED_FILES || "[]");
        const changedJSONFiles = changedFiles
            .filter((file) => file.startsWith("domains/"))
            .map((file) => path.basename(file));
        
        // Skip check for trusted users or bypassed PRs
        if (trustedUsers.includes(process.env.PR_AUTHOR_ID) || 
            (process.env.PR_LABELS && process.env.PR_LABELS.includes("ci: bypass-screenshot"))) {
            return t.pass();
        }
        
        // Get the PR body
        const prBody = process.env.PR_BODY || "";
        
        // For each changed domain file
        changedJSONFiles.forEach((file) => {
            const subdomain = file.replace(/\.json$/, "");
            const data = getDomainData(subdomain);
            
            // Skip check if domain is email-only (only has MX records)
            const isEmailOnly = Object.keys(data.record).length === 1 && Object.keys(data.record)[0] === "MX";
            if (isEmailOnly) return;
            
            // Check if PR body contains a screenshot link
            const hasScreenshotLink = /\!\[.*\]\(https?:\/\/.*\.(png|jpg|jpeg|gif)\)/.test(prBody);
            
            t.true(
                hasScreenshotLink, 
                `${subdomain}: PR must include a screenshot link for non-email domains`
            );
        });
    }
    
    t.pass();
});
