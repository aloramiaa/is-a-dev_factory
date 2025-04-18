"use client"

import { motion } from "framer-motion"
import { NavBar } from "@/components/nav-bar"
import { BackgroundGrid } from "@/components/background-grid"
import { JsonPreview } from "@/components/json-preview"

export default function DocsPage() {
  const exampleJson = `{
  "description": "Documentation website for is-a.dev",
  "repo": "https://github.com/is-a-dev/docs",
  "owner": {
    "username": "is-a-dev",
    "email": "your-email@example.com"
  },
  "record": {
    "CNAME": "is-a-dev-docs.pages.dev"
  },
  "proxied": true
}`

  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden">
      <BackgroundGrid />
      <NavBar />

      <div className="container mx-auto px-4 py-24 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <header className="mb-12">
            <h1 className="text-4xl font-bold text-purple-300 mb-4">Documentation</h1>
            <p className="text-purple-200">Learn how to register and configure your .is-a.dev domain.</p>
          </header>

          <div className="space-y-12">
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-purple-300">Domain Structure</h2>
              <p className="text-purple-200">
                To register a subdomain, you must create a new JSON file in the domains directory through a pull
                request. For example, to register example.is-a.dev, you would create a file named example.json in the
                domains directory. The full path would be domains/example.json.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-purple-300">Filename</h2>
              <p className="text-purple-200">
                Note: You can include . (dots) in your filename to register a sub-subdomain (e.g.,
                blog.example.is-a.dev). However, each segment of your subdomain must meet the following criteria:
              </p>
              <ul className="list-disc pl-6 text-purple-200 space-y-2">
                <li>Must be alphanumeric, in lowercase. Dashes (-) may be used as separators.</li>
                <li>Must be at least 1 character.</li>
                <li>Must have a .json file extension.</li>
                <li>Must not contain is-a.dev.</li>
              </ul>

              <div className="mt-6 space-y-4">
                <h3 className="text-xl font-bold text-purple-300">Examples of Invalid Filenames</h3>
                <ul className="list-disc pl-6 text-purple-200 space-y-2">
                  <li>.json (filename is less than 1 character.)</li>
                  <li>A.json (filename contains uppercase letters.)</li>
                  <li>a..json (filename contains consecutive dots.)</li>
                  <li>.a.json (filename starts with a dot.)</li>
                  <li>a .json (filename contains a space.)</li>
                  <li>a$.json (filename contains a non-alphanumeric character.)</li>
                  <li>a.json.json (filename contains more than one .json extension.)</li>
                  <li>a.is-a.dev.json (filename contains .is-a.dev.)</li>
                </ul>
              </div>

              <div className="mt-6 space-y-4">
                <h3 className="text-xl font-bold text-purple-300">Examples of Valid Filenames</h3>
                <ul className="list-disc pl-6 text-purple-200 space-y-2">
                  <li>a.json (at least 1 character long.)</li>
                  <li>example.json (alphanumeric and in lowercase.)</li>
                  <li>
                    blog.example.json (includes dots to register a sub-subdomain, also called a nested subdomain.)
                  </li>
                  <li>my-blog.json (uses dashes as separators, which is recommended.)</li>
                </ul>
                <p className="text-purple-200 mt-2">
                  NOTE: To stop a user from having a monopoly over one-lettered subdomains, we limit users to only one
                  one-lettered subdomain.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-purple-300">Example JSON File</h2>
              <p className="text-purple-200">domains/docs.json</p>
              <JsonPreview json={exampleJson} />
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-purple-300">Structure</h2>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-purple-300">owner (required)</h3>
                <p className="text-purple-200">
                  You need to specify some information about yourself here. This is so that you can be contacted if
                  required. In the owner object, the fields username and email are required. You may add more
                  information in this object if you want, such as a discord field.
                </p>
                <pre className="bg-black/40 p-4 rounded-md border border-purple-500 text-purple-200 overflow-auto">
                  {`{
  "owner": {
    "username": "your-github-username",
    "email": "your-email@example.com"
  }
}`}
                </pre>
              </div>

              <div className="space-y-4 mt-6">
                <h3 className="text-xl font-bold text-purple-300">description</h3>
                <p className="text-purple-200">
                  Describe your domain name and your usage. This is purely for documentation purpose and is optional.
                </p>
              </div>

              <div className="space-y-4 mt-6">
                <h3 className="text-xl font-bold text-purple-300">repo</h3>
                <p className="text-purple-200">
                  This is a link to your website repository or your GitHub account. This is purely for documentation
                  purpose and is optional.
                </p>
              </div>

              <div className="space-y-4 mt-6">
                <h3 className="text-xl font-bold text-purple-300">record (required)</h3>
                <p className="text-purple-200">
                  This section is where you specify the DNS records. You can see a list of supported record types in our
                  factory tool.
                </p>
                <p className="text-purple-200">Below are some examples for the given record types:</p>

                <div className="space-y-2 mt-4">
                  <h4 className="text-lg font-bold text-purple-300">CNAME record</h4>
                  <p className="text-purple-200">
                    This must be a hostname (something.tld). It cannot be used in conjunction with any other record
                    types unless your domain is proxied (see proxying your domain). This is typically used to map your
                    domain to a specific server.
                  </p>
                  <pre className="bg-black/40 p-4 rounded-md border border-purple-500 text-purple-200 overflow-auto">
                    {`{
  "record": {
    "CNAME": "github-username.github.io"
  }
}`}
                  </pre>
                </div>

                <div className="space-y-2 mt-4">
                  <h4 className="text-lg font-bold text-purple-300">A record</h4>
                  <p className="text-purple-200">
                    This must be a list of IPv4 addresses. These addresses point your domain to a specific server.
                  </p>
                  <pre className="bg-black/40 p-4 rounded-md border border-purple-500 text-purple-200 overflow-auto">
                    {`{
  "record": {
    "A": [
      "192.0.2.1",
      "198.51.100.1",
      "203.0.113.1"
    ]
  }
}`}
                  </pre>
                </div>
              </div>

              <div className="space-y-4 mt-6">
                <h3 className="text-xl font-bold text-purple-300">proxied (optional)</h3>
                <p className="text-purple-200">
                  Enable Cloudflare proxy for your domain. This is disabled by default. To enable it, add this line of
                  code:
                </p>
                <pre className="bg-black/40 p-4 rounded-md border border-purple-500 text-purple-200 overflow-auto">
                  {`"proxied": true`}
                </pre>
              </div>

              <div className="space-y-4 mt-6">
                <h3 className="text-xl font-bold text-purple-300">redirect_config (optional)</h3>
                <p className="text-purple-200">Allows custom redirect endpoints for your domain.</p>
                <pre className="bg-black/40 p-4 rounded-md border border-purple-500 text-purple-200 overflow-auto">
                  {`"redirect_config": {
  "custom_paths": {
    "/github": "https://github.com/username"
  },
  "redirect_paths": true
}`}
                </pre>
              </div>
            </section>
          </div>
        </motion.div>
      </div>
    </main>
  )
}
