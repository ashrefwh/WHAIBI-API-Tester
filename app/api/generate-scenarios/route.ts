import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

interface TestScenario {
  name: string
  description: string
  method: string
  url: string
  headers?: Record<string, string>
  body?: string
  expectedStatus?: number
}

interface ScenariosResponse {
  scenarios: TestScenario[]
}

interface StaticAttribute {
  name: string
  value: string
}

function parseCurlCommand(curlCommand: string) {
  try {
    const cleanCurl = curlCommand.replace(/\^"/g, '"').replace(/\^/g, "")

    // Extract URL
    const urlMatch = cleanCurl.match(/curl\s+(?:-X\s+\w+\s+)?['"]*([^'">\s]+)['"]*/)
    const url = urlMatch ? urlMatch[1] : ""

    const methodMatch = cleanCurl.match(/-X\s+(\w+)/)
    let method = methodMatch ? methodMatch[1] : "GET"

    // If no explicit method but has data, assume POST
    if (
      !methodMatch &&
      (cleanCurl.includes("--data-raw") || cleanCurl.includes("--data") || cleanCurl.includes("-d "))
    ) {
      method = "POST"
    }

    // Extract headers
    const headers: Record<string, string> = {}
    const headerMatches = cleanCurl.matchAll(/-H\s+['"](.*?)['"]/g)
    for (const match of headerMatches) {
      const [key, ...valueParts] = match[1].split(":")
      if (key && valueParts.length > 0) {
        headers[key.trim()] = valueParts.join(":").trim()
      }
    }

    let body = null

    // Try different data patterns
    const dataPatterns = [
      /--data-raw\s+['"](.*?)['"](?:\s|$)/s, // --data-raw with quotes
      /--data-raw\s+([^-\s].*?)(?:\s+-|$)/s, // --data-raw without quotes
      /--data\s+['"](.*?)['"](?:\s|$)/s, // --data with quotes
      /-d\s+['"](.*?)['"](?:\s|$)/s, // -d with quotes
    ]

    for (const pattern of dataPatterns) {
      const dataMatch = cleanCurl.match(pattern)
      if (dataMatch && dataMatch[1]) {
        body = dataMatch[1]
        break
      }
    }

    if (body) {
      // Handle Windows command line escaping
      body = body
        .replace(/\\\\/g, "\\") // Double backslashes
        .replace(/\\"/g, '"') // Escaped quotes
        .replace(/\^"/g, '"') // Windows caret escaping
        .replace(/\^/g, "") // Remove remaining carets

      console.log("[v0] Extracted body:", body.substring(0, 200) + "...")
    }

    console.log("[v0] Parsed cURL:", { url, method, hasBody: !!body, headersCount: Object.keys(headers).length })

    return { url, method, headers, body }
  } catch (error) {
    console.error("[v0] Error parsing cURL:", error)
    return { url: "", method: "GET", headers: {}, body: null }
  }
}

function analyzeApiContext(parsedCurl: {
  url: string
  method: string
  headers: Record<string, string>
  body: string | null
}) {
  const { url, method, body } = parsedCurl

  // Extract endpoint information
  const urlParts = url.toLowerCase().split("/")
  const queryParams = url.includes("?") ? url.split("?")[1] : ""

  // Analyze URL structure for business context
  const domainIndicators = {
    auth: ["auth", "login", "register", "signin", "signup", "token", "oauth"],
    user: ["user", "profile", "account", "member", "customer"],
    company: ["company", "organization", "business", "enterprise", "corp"],
    product: ["product", "item", "catalog", "inventory", "goods"],
    order: ["order", "purchase", "transaction", "payment", "checkout"],
    content: ["post", "article", "blog", "content", "media", "document"],
    finance: ["payment", "invoice", "billing", "subscription", "wallet"],
    communication: ["message", "notification", "email", "sms", "chat"],
    analytics: ["analytics", "stats", "metrics", "report", "dashboard"],
    admin: ["admin", "management", "config", "settings", "control"],
    iot: ["iot", "sensor", "device", "capture"],
  }

  let detectedDomain = "generic"
  let confidence = 0

  // Analyze URL for domain indicators
  for (const [domain, indicators] of Object.entries(domainIndicators)) {
    const matches = indicators.filter(
      (indicator) => urlParts.some((part) => part.includes(indicator)) || queryParams.includes(indicator),
    ).length

    if (matches > confidence) {
      confidence = matches
      detectedDomain = domain
    }
  }

  // Analyze payload for additional context
  let payloadContext = {}
  if (body) {
    try {
      const bodyObj = JSON.parse(body)
      const fields = Object.keys(bodyObj)

      // Detect field patterns
      const fieldPatterns = {
        hasEmail: fields.some((f) => f.toLowerCase().includes("email")),
        hasPassword: fields.some((f) => f.toLowerCase().includes("password")),
        hasName: fields.some((f) => f.toLowerCase().includes("name")),
        hasAddress: fields.some((f) => f.toLowerCase().includes("address")),
        hasPhone: fields.some((f) => f.toLowerCase().includes("phone")),
        hasPrice: fields.some((f) => f.toLowerCase().includes("price") || f.toLowerCase().includes("amount")),
        hasDate: fields.some((f) => f.toLowerCase().includes("date") || f.toLowerCase().includes("time")),
        hasId: fields.some((f) => f.toLowerCase().includes("id")),
        hasStatus: fields.some((f) => f.toLowerCase().includes("status")),
        hasType: fields.some((f) => f.toLowerCase().includes("type")),
      }

      // Refine domain detection based on payload
      if (fieldPatterns.hasEmail && fieldPatterns.hasPassword) {
        detectedDomain = "auth"
        confidence += 2
      } else if (fieldPatterns.hasPrice && fieldPatterns.hasName) {
        detectedDomain = "product"
        confidence += 2
      } else if (fieldPatterns.hasAddress && fieldPatterns.hasPhone) {
        detectedDomain = "user"
        confidence += 2
      }

      payloadContext = { fields, patterns: fieldPatterns, sampleData: bodyObj }
    } catch (e) {
      // Invalid JSON, keep as generic
    }
  }

  return {
    domain: detectedDomain,
    confidence,
    endpoint: urlParts[urlParts.length - 1] || "unknown",
    resource: urlParts[urlParts.length - 2] || "unknown",
    payloadContext,
    businessContext: generateBusinessContext(detectedDomain, payloadContext),
  }
}

function generateBusinessContext(domain: string, payloadContext: any): string {
  const contexts = {
    auth: "API d'authentification - gestion des connexions, inscriptions et tokens",
    user: "API de gestion utilisateurs - profils, comptes et données personnelles",
    company: "API de gestion d'entreprises - organisations, sociétés et entités business",
    product: "API de gestion produits - catalogue, inventaire et références",
    order: "API de commandes - transactions, achats et processus de vente",
    content: "API de contenu - articles, médias et publications",
    finance: "API financière - paiements, facturation et transactions monétaires",
    communication: "API de communication - messages, notifications et échanges",
    analytics: "API d'analytics - statistiques, métriques et rapports",
    admin: "API d'administration - configuration, gestion et contrôle système",
    iot: "API IoT - gestion des capteurs et appareils",
    generic: "API générique - fonctionnalités diverses",
  }

  return contexts[domain] || contexts.generic
}

export async function POST(request: NextRequest) {
  try {
    const { curlCommand, explanation, staticAttributes = [] } = await request.json()

    if (!curlCommand) {
      return NextResponse.json({ error: "Commande cURL requise" }, { status: 400 })
    }

    if (!explanation) {
      return NextResponse.json(
        { error: "Explication requise pour aider l'IA à comprendre le contexte" },
        { status: 400 },
      )
    }

    const parsedCurl = parseCurlCommand(curlCommand)
    const apiContext = analyzeApiContext(parsedCurl)

    console.log("[v0] Analyzed API context:", {
      domain: apiContext.domain,
      confidence: apiContext.confidence,
      businessContext: apiContext.businessContext,
    })

    const staticAttributesText =
      staticAttributes.length > 0
        ? `\n🔒 **ATTRIBUTS STATIQUES OBLIGATOIRES (NE JAMAIS MODIFIER):**\n${staticAttributes.map((attr) => `- **${attr.name}**: TOUJOURS "${attr.value}" (valeur fixe dans TOUS les scénarios)`).join("\n")}\n`
        : ""

    const prompt = `
Tu es un EXPERT DOCTEUR en QA et tests d'API avec 20+ ans d'expérience. Tu dois analyser ce cURL comme un ingénieur QA senior avec 20+ ans d'experience et générer une suite complète de tests professionnels.

COMMANDE cURL À ANALYSER:
${curlCommand}

🎯 **EXPLICATION UTILISATEUR (CONTEXTE MÉTIER CRITIQUE):**
${explanation}
${staticAttributesText}
CONTEXTE MÉTIER DÉTECTÉ:
- **Domaine**: ${apiContext.domain} (confiance: ${apiContext.confidence})
- **Description**: ${apiContext.businessContext}
- **Endpoint**: ${apiContext.endpoint}
- **Méthode**: ${parsedCurl.method}
- **URL**: ${parsedCurl.url}
- **Payload présent**: ${!!parsedCurl.body}
${apiContext.payloadContext.fields ? `- **Champs**: ${apiContext.payloadContext.fields.join(", ")}` : ""}

🚨 **RÈGLE CRITIQUE - JAMAIS INVENTER DE NOUVEAUX CHAMPS** 🚨
**INTERDICTION ABSOLUE :**
❌ **TU NE DOIS JAMAIS AJOUTER DE NOUVEAUX CHAMPS** qui n'existent pas dans le cURL original
❌ **INTERDIT** : "timestamp", "largeField", "specialChars", "nullField", etc.
✅ **OBLIGATOIRE** : Utiliser UNIQUEMENT les champs présents dans le payload original

**EXEMPLE CONCRET :**
Si le cURL contient : {"name": "test", "email": "test@example.com"}
❌ INTERDIT : {"name": "test", "email": "test@example.com", "timestamp": 1234567890}
✅ CORRECT : {"name": "TechSolutions", "email": "jean.martin.1234@example.com"}

🚨 **RÈGLE CRITIQUE D'ISOLATION DES TESTS - EXPERT QA 15+ ANS** 🚨
PRINCIPE FONDAMENTAL : UN TEST = UN SEUL PROBLÈME À LA FOIS

**ISOLATION PARFAITE OBLIGATOIRE :**
1. **Test "name invalide"** → name: INVALIDE, TOUS autres champs: VALIDES + UNIQUES
2. **Test "email invalide"** → email: INVALIDE, TOUS autres champs: VALIDES + UNIQUES  
3. **Test "linkedin invalide"** → linkedin: INVALIDE, TOUS autres champs: VALIDES + UNIQUES

**EXEMPLE CONCRET D'ISOLATION :**
❌ MAUVAIS: Test "name invalide" avec email existant → Erreur 409 "Email exists" (masque l'erreur de name)
✅ CORRECT: Test "name invalide" avec email unique → Erreur 400 "Name invalid" (isole le problème)

🔒 **RÈGLE ABSOLUE POUR ATTRIBUTS STATIQUES** 🔒
${
  staticAttributes.length > 0
    ? `LES CHAMPS SUIVANTS DOIVENT AVOIR EXACTEMENT CES VALEURS DANS TOUS LES SCÉNARIOS :
${staticAttributes.map((attr) => `- "${attr.name}": "${attr.value}" (JAMAIS d'autre valeur !)`).join("\n")}

**ISOLATION AVEC ATTRIBUTS STATIQUES :**
- Attributs statiques : TOUJOURS leurs valeurs fixes
- Champ testé : INVALIDE (si c'est un test d'erreur)
- TOUS autres champs : VALIDES + UNIQUES (emails avec timestamps, etc.)

TU NE DOIS JAMAIS GÉNÉRER D'AUTRES VALEURS POUR CES CHAMPS !`
    : "Aucun attribut statique spécifié."
}

**UTILISE L'EXPLICATION UTILISATEUR POUR:**
1. **Comprendre les contraintes métier** (types acceptés, formats, règles de validation)
2. **Générer des données conformes** aux spécifications utilisateur
3. **Créer des tests pertinents** selon les règles métier expliquées
4. **Adapter les scénarios** aux cas d'usage réels décrits
5. **RESPECTER ABSOLUMENT** les attributs statiques spécifiés
6. **ASSURER L'ISOLATION PARFAITE** de chaque test
7. **NE JAMAIS INVENTER DE NOUVEAUX CHAMPS** non présents dans le cURL

**GÉNÉRATION DE DONNÉES RÉALISTES - EXEMPLES CONCRETS:**

❌ **INTERDIT** : "TestUser1234567890", "TestName1755943608718", "TestValue123456"
✅ **OBLIGATOIRE** : Données humaines réalistes avec unicité discrète

**EXEMPLES PRÉCIS PAR TYPE DE CHAMP:**

**Prénoms (firstName, first_name):**
- ✅ "Jean", "Marie", "Pierre", "Sophie"
- ❌ "TestUser1234567890", "TestName1755943608718"

**Noms (lastName, last_name):**
- ✅ "Martin", "Dubois", "Bernard", "Moreau"
- ❌ "TestFamily1234567890", "TestLastName1755943608718"

**Noms d'entreprise (name, companyName):**
- ✅ "TechSolutions", "InnovaCorp", "DigitalPro"
- ❌ "TestName1755943608718", "TestCompany1234567890"

**Types d'entreprise (companyType, type):**
- Utilise EXACTEMENT les valeurs mentionnées dans l'explication utilisateur OU les attributs statiques
- ✅ Selon explication: "IT_SERVICES_COMPANY", "END_CLIENT", etc.
- ❌ "TestValue1755943608718", "TestType1234567890"

**Emails (UNICITÉ OBLIGATOIRE):**
- ✅ "jean.martin.2024@example.com", "marie.dubois.test@example.com"
- ❌ "test.user@example.com", emails dupliqués

**Sites web (UNICITÉ OBLIGATOIRE):**
- ✅ "https://techsolutions.com", "https://innovacorp.fr"
- ❌ "https://www.test.com", URLs dupliquées

**LinkedIn (UNICITÉ OBLIGATOIRE):**
- ✅ "https://linkedin.com/company/techsolutions"
- ❌ "https://www.linkedin.com/company/test", URLs dupliquées

**STRATÉGIE D'UNICITÉ POUR ISOLATION :**
- **Emails** : Ajouter suffixe unique (timestamp discret) : "jean.martin.1234@example.com"
- **URLs** : Varier les noms de domaine : "techsolutions.com", "innovacorp.fr"
- **Noms humains** : Peuvent être dupliqués (Jean, Marie sont OK)
- **IDs/Codes** : Toujours uniques avec suffixes

**ISOLATION PARFAITE - EXEMPLE CONCRET :**
❌ MAUVAIS: Test "linkedin invalide" avec firstName: "TestUser", email: "existing@email.com"
✅ CORRECT: Test "linkedin invalide" avec firstName: "Jean", email: "jean.martin.unique@example.com", linkedin: "invalid-url"

**MISSION**: Génère 12-15 scénarios avec données HUMAINES RÉALISTES selon le contexte métier détecté ET l'explication utilisateur, en respectant l'ISOLATION PARFAITE des tests ET les attributs statiques obligatoires, SANS JAMAIS INVENTER DE NOUVEAUX CHAMPS.

**FORMAT DE RÉPONSE OBLIGATOIRE:**
{
  "scenarios": [
    {
      "name": "Nom descriptif du test",
      "description": "Description détaillée du cas testé avec isolation parfaite",
      "method": "${parsedCurl.method}",
      "url": "${parsedCurl.url}",
      "headers": {...},
      "body": "...", // UNIQUEMENT les champs du cURL original avec données HUMAINES RÉALISTES + ISOLATION PARFAITE + attributs statiques respectés
      "expectedStatus": 200
    }
  ]
}

GÉNÈRE MAINTENANT 12-15 SCÉNARIOS AVEC ISOLATION PARFAITE, DONNÉES HUMAINES RÉALISTES, RESPECT ABSOLU DES ATTRIBUTS STATIQUES ET SANS JAMAIS INVENTER DE NOUVEAUX CHAMPS !
`

    console.log("[v0] Sending comprehensive QA expert prompt with user explanation and static attributes to AI...")

    const result = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt,
      maxTokens: 6000, // Increased token limit for more scenarios
    })

    let scenarios: ScenariosResponse
    try {
      let jsonString = result.text.trim()
      console.log("[v0] Raw AI response length:", jsonString.length)

      // Clean up AI response
      const introPatterns = [/^.*?(?=\{)/s, /```json\s*/gi, /```\s*/gi]

      for (const pattern of introPatterns) {
        jsonString = jsonString.replace(pattern, "")
      }

      const codeBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1].trim()
      }

      const firstBraceIndex = jsonString.indexOf("{")
      if (firstBraceIndex === -1) {
        throw new Error("No JSON object found in AI response")
      }

      let braceCount = 0
      let endIndex = -1

      for (let i = firstBraceIndex; i < jsonString.length; i++) {
        const char = jsonString[i]
        if (char === "{") {
          braceCount++
        } else if (char === "}") {
          braceCount--
          if (braceCount === 0) {
            endIndex = i
            break
          }
        }
      }

      if (endIndex === -1) {
        throw new Error("Incomplete JSON object in AI response")
      }

      jsonString = jsonString.substring(firstBraceIndex, endIndex + 1)
      jsonString = jsonString
        .replace(/,(\s*[}\]])/g, "$1")
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":')
        .trim()

      console.log("[v0] Cleaned JSON length:", jsonString.length)
      scenarios = JSON.parse(jsonString)

      if (!scenarios.scenarios || !Array.isArray(scenarios.scenarios)) {
        throw new Error("Invalid scenarios structure in AI response")
      }

      console.log("[v0] Successfully parsed", scenarios.scenarios.length, "scenarios from AI")
    } catch (parseError) {
      console.error("[v0] AI JSON parsing failed, generating comprehensive fallback:", parseError)

      scenarios = generateComprehensiveFallback(parsedCurl, apiContext, staticAttributes)
    }

    return NextResponse.json({
      scenarios: scenarios.scenarios,
    })
  } catch (error) {
    console.error("[v0] Error generating scenarios:", error)
    return NextResponse.json(
      {
        error: `Erreur génération scénarios: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
      },
      { status: 500 },
    )
  }
}

function analyzeFieldContext(
  fieldName: string,
  domain: string,
): {
  needsUniqueness: boolean
  dataType: "human_name" | "business_name" | "identifier" | "contact" | "url" | "generic"
  isHumanReadable: boolean
} {
  const lowerField = fieldName.toLowerCase()

  // Human names - never need timestamps, can be duplicated
  if (lowerField.match(/^(first_?name|last_?name|given_?name|family_?name|prenom|nom)$/)) {
    return { needsUniqueness: false, dataType: "human_name", isHumanReadable: true }
  }

  // Contact fields that need uniqueness
  if (lowerField.includes("email") || lowerField.includes("username") || lowerField.includes("login")) {
    return { needsUniqueness: true, dataType: "contact", isHumanReadable: true }
  }

  // URLs that need uniqueness
  if (lowerField.includes("url") || lowerField.includes("website") || lowerField.includes("linkedin")) {
    return { needsUniqueness: true, dataType: "url", isHumanReadable: true }
  }

  // Business names - context dependent
  if (lowerField.includes("name") && !lowerField.includes("first") && !lowerField.includes("last")) {
    if (domain === "company" || lowerField.includes("company") || lowerField.includes("business")) {
      return { needsUniqueness: true, dataType: "business_name", isHumanReadable: true }
    }
    if (lowerField.includes("product") || lowerField.includes("item")) {
      return { needsUniqueness: true, dataType: "business_name", isHumanReadable: true }
    }
    // Generic name field
    return { needsUniqueness: true, dataType: "business_name", isHumanReadable: true }
  }

  // IDs and identifiers always need uniqueness
  if (lowerField.includes("id") || lowerField.includes("ref") || lowerField.includes("code")) {
    return { needsUniqueness: true, dataType: "identifier", isHumanReadable: false }
  }

  // Phone numbers need uniqueness
  if (lowerField.includes("phone") || lowerField.includes("tel")) {
    return { needsUniqueness: true, dataType: "contact", isHumanReadable: false }
  }

  // Default: generic field that might need uniqueness
  return { needsUniqueness: false, dataType: "generic", isHumanReadable: true }
}

function generateComprehensiveFallback(
  parsedCurl: { url: string; method: string; headers: Record<string, string>; body: string | null },
  apiContext: any,
  staticAttributes: StaticAttribute[] = [],
): ScenariosResponse {
  const { url, method, headers, body } = parsedCurl
  const timestamp = Date.now()

  console.log("[v0] Generating comprehensive fallback with 12+ scenarios for domain:", apiContext.domain)

  const scenarios: TestScenario[] = []

  // 1. TESTS MÉTIER SPÉCIALISÉS
  if (body) {
    try {
      const bodyObj = JSON.parse(body)
      const fields = Object.keys(bodyObj)

      // Test valide avec données modifiées
      scenarios.push({
        name: `${apiContext.domain} - Données valides`,
        description: `Test nominal avec données valides pour ${apiContext.businessContext}`,
        method,
        url,
        headers: { ...headers },
        body: JSON.stringify(generateValidTestData(bodyObj, apiContext.domain, timestamp, staticAttributes)),
        expectedStatus: method === "POST" ? 201 : 200,
      })

      // Tests de validation par champ avec isolation parfaite
      fields.forEach((field, index) => {
        if (index < 4) {
          // Increased to 4 fields for better coverage
          // Generate base valid data with unique values
          const baseValidData = generateValidTestData(bodyObj, apiContext.domain, timestamp + index, staticAttributes)

          // Then make ONLY the target field invalid (unless it's a static attribute)
          const isStaticField = staticAttributes.some((attr) => attr.name === field)
          if (!isStaticField) {
            const invalidData = { ...baseValidData }
            invalidData[field] = generateInvalidValue(field, bodyObj[field])

            scenarios.push({
              name: `Validation - ${field} invalide`,
              description: `Test avec ${field} contenant une valeur invalide, tous autres champs valides et uniques`,
              method,
              url,
              headers: { ...headers },
              body: JSON.stringify(invalidData),
              expectedStatus: 400,
            })
          }
        }
      })

      // Test champs manquants avec données valides et uniques
      const requiredField = fields.find((field) => !staticAttributes.some((attr) => attr.name === field)) || fields[0]
      const validDataForMissingTest = generateValidTestData(
        bodyObj,
        apiContext.domain,
        timestamp + 100,
        staticAttributes,
      )
      delete validDataForMissingTest[requiredField]

      scenarios.push({
        name: `Validation - ${requiredField} manquant`,
        description: `Test avec champ obligatoire ${requiredField} manquant, autres champs valides et uniques`,
        method,
        url,
        headers: { ...headers },
        body: JSON.stringify(validDataForMissingTest),
        expectedStatus: 400,
      })
    } catch (e) {
      console.log("[v0] Could not parse body for detailed validation tests")
    }
  }

  // 2. TESTS DE SÉCURITÉ
  scenarios.push(
    {
      name: "Sécurité - Authentification manquante",
      description: "Test sans token d'authentification",
      method,
      url,
      headers: { ...headers, Authorization: undefined } as any,
      body: body || undefined,
      expectedStatus: 401,
    },
    {
      name: "Sécurité - Token invalide",
      description: "Test avec token d'authentification invalide",
      method,
      url,
      headers: { ...headers, Authorization: "Bearer invalid_token_12345" },
      body: body || undefined,
      expectedStatus: 401,
    },
    {
      name: "Sécurité - Injection SQL",
      description: "Test d'injection SQL dans les paramètres",
      method,
      url: url.includes("?") ? `${url}&id=1' OR '1'='1` : `${url}?id=1' OR '1'='1`,
      headers: { ...headers },
      body: body || undefined,
      expectedStatus: 400,
    },
  )

  // 3. TESTS DE PERFORMANCE - Using only original payload structure
  if (body) {
    try {
      const bodyObj = JSON.parse(body)

      scenarios.push({
        name: "Performance - Rate limiting",
        description: "Test de limitation de taux",
        method,
        url,
        headers: { ...headers, "X-Test-Rate-Limit": "true" },
        body: JSON.stringify(generateValidTestData(bodyObj, apiContext.domain, timestamp + 200, staticAttributes)),
        expectedStatus: 429,
      })
    } catch (e) {
      scenarios.push({
        name: "Performance - Rate limiting",
        description: "Test de limitation de taux",
        method,
        url,
        headers: { ...headers, "X-Test-Rate-Limit": "true" },
        body: body || undefined,
        expectedStatus: 429,
      })
    }
  }

  // 4. TESTS D'ERREURS HTTP
  scenarios.push(
    {
      name: "Erreur - Ressource inexistante",
      description: "Test avec ID de ressource inexistant",
      method,
      url: url.replace(/\/\d+/, "/999999"),
      headers: { ...headers },
      body: body || undefined,
      expectedStatus: 404,
    },
    {
      name: "Erreur - Conflit de données",
      description: "Test de création avec données en conflit",
      method,
      url,
      headers: { ...headers },
      body: body || undefined,
      expectedStatus: 409,
    },
  )

  console.log("[v0] Generated", scenarios.length, "comprehensive test scenarios")
  return { scenarios }
}

function generateValidTestData(
  originalData: any,
  domain: string,
  timestamp: number,
  staticAttributes: StaticAttribute[] = [],
): any {
  const testData = { ...originalData }

  staticAttributes.forEach((attr) => {
    if (testData.hasOwnProperty(attr.name)) {
      testData[attr.name] = attr.value
      console.log(`[v0] Applied static attribute: ${attr.name} = ${attr.value}`)
    }
  })

  const realisticData = {
    firstNames: [
      "Jean",
      "Marie",
      "Pierre",
      "Sophie",
      "Ahmed",
      "Fatima",
      "David",
      "Sarah",
      "Lucas",
      "Emma",
      "Thomas",
      "Julie",
      "Nicolas",
      "Camille",
      "Alexandre",
    ],
    lastNames: [
      "Martin",
      "Dubois",
      "Bernard",
      "Moreau",
      "Petit",
      "Robert",
      "Richard",
      "Durand",
      "Leroy",
      "Simon",
      "Laurent",
      "Lefebvre",
      "Michel",
      "Garcia",
    ],
    companyNames: [
      "TechSolutions",
      "InnovaCorp",
      "DigitalPro",
      "SmartBusiness",
      "FutureTech",
      "ProServices",
      "EliteConsulting",
      "NextGen",
      "DataFlow",
      "CloudTech",
      "WebMaster",
      "CodeCraft",
      "InnovateLab",
      "TechVision",
      "DigitalEdge",
    ],
    companyTypes: [
      "IT_SERVICES_COMPANY",
      "CONSULTING",
      "MANUFACTURING",
      "RETAIL",
      "FINANCE",
      "HEALTHCARE",
      "EDUCATION",
      "LOGISTICS",
    ],
    productNames: [
      "Smartphone Pro",
      "Laptop Gaming",
      "Casque Audio",
      "Tablette Design",
      "Montre Connectée",
      "Écouteurs Sans Fil",
    ],
    domains: [".com", ".fr", ".net", ".org", ".io", ".tech"],
    linkedinSuffixes: ["", "-corp", "-group", "-solutions", "-tech", "-consulting"],
  }

  Object.keys(testData).forEach((key) => {
    const isStaticField = staticAttributes.some((attr) => attr.name === key)
    if (isStaticField) {
      return // Skip processing, value already set above
    }

    const lowerKey = key.toLowerCase()
    const fieldContext = analyzeFieldContext(key, domain)

    const index = Math.abs(timestamp + key.length) % 1000

    if (lowerKey.includes("email")) {
      const firstName = realisticData.firstNames[index % realisticData.firstNames.length].toLowerCase()
      const lastName = realisticData.lastNames[index % realisticData.lastNames.length].toLowerCase()
      testData[key] = `${firstName}.${lastName}.${timestamp}@example.com`
    } else if (fieldContext.dataType === "human_name") {
      if (lowerKey.includes("first")) {
        testData[key] = realisticData.firstNames[index % realisticData.firstNames.length]
      } else {
        testData[key] = realisticData.lastNames[index % realisticData.lastNames.length]
      }
    } else if (fieldContext.dataType === "business_name") {
      const baseName =
        domain === "company" || lowerKey.includes("company")
          ? realisticData.companyNames[index % realisticData.companyNames.length]
          : lowerKey.includes("product")
            ? realisticData.productNames[index % realisticData.productNames.length]
            : realisticData.companyNames[index % realisticData.companyNames.length]

      testData[key] = fieldContext.needsUniqueness && lowerKey === "name" ? `${baseName} ${index}` : baseName
    } else if (lowerKey.includes("type") && (domain === "company" || lowerKey.includes("company"))) {
      testData[key] = realisticData.companyTypes[index % realisticData.companyTypes.length]
    } else if (lowerKey.includes("phone")) {
      const phoneNumber = `0${Math.floor(Math.random() * 9) + 1}${(timestamp % 100000000).toString().padStart(8, "0")}`
      testData[key] = phoneNumber
    } else if (lowerKey.includes("linkedin")) {
      const companyName = realisticData.companyNames[index % realisticData.companyNames.length]
        .toLowerCase()
        .replace(/\s+/g, "")
      const suffix = realisticData.linkedinSuffixes[index % realisticData.linkedinSuffixes.length]
      testData[key] = `https://linkedin.com/company/${companyName}${suffix}-${timestamp}`
    } else if (lowerKey.includes("website") || (lowerKey.includes("url") && !lowerKey.includes("linkedin"))) {
      const companyName = realisticData.companyNames[index % realisticData.companyNames.length]
        .toLowerCase()
        .replace(/\s+/g, "")
      const domain = realisticData.domains[index % realisticData.domains.length]
      testData[key] = `https://${companyName}-${timestamp}${domain}`
    } else if (lowerKey.includes("password")) {
      const passwords = ["SecurePass123!", "MyPassword2024!", "StrongPwd456!", "SafeLogin789!"]
      testData[key] = passwords[index % passwords.length]
    } else if (lowerKey.includes("price") || lowerKey.includes("amount")) {
      testData[key] = Number.parseFloat((Math.random() * 1000 + 10).toFixed(2))
    } else if (fieldContext.dataType === "identifier") {
      testData[key] = `${lowerKey}_${timestamp}_${index}`
    } else if (typeof testData[key] === "string" && testData[key].length > 10) {
      if (fieldContext.isHumanReadable) {
        const baseName =
          domain === "company"
            ? realisticData.companyNames[index % realisticData.companyNames.length]
            : domain === "product"
              ? realisticData.productNames[index % realisticData.productNames.length]
              : "Valeur Réaliste"

        testData[key] = fieldContext.needsUniqueness ? `${baseName} ${timestamp}` : baseName
      } else {
        testData[key] = `value_${timestamp}_${index}`
      }
    }
  })

  return testData
}

function generateInvalidValue(fieldName: string, originalValue: any): any {
  const lowerField = fieldName.toLowerCase()

  if (lowerField.includes("email")) {
    return "invalid-email-format-without-at-symbol"
  } else if (lowerField.includes("phone")) {
    return "invalid-phone-123abc"
  } else if (lowerField.includes("url") || lowerField.includes("website") || lowerField.includes("linkedin")) {
    return "not-a-valid-url-format"
  } else if (lowerField.includes("password")) {
    return "123" // Too weak password
  } else if (lowerField.includes("name") && typeof originalValue === "string") {
    return "x".repeat(1000)
  } else if (typeof originalValue === "number") {
    return -999999 // Invalid negative number
  } else if (typeof originalValue === "boolean") {
    return "not-a-boolean-value"
  } else if (typeof originalValue === "string") {
    return "x".repeat(1000) // Too long string
  }

  return null // Invalid null value
}
