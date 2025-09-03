import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

interface TestResult {
  scenario: {
    name: string
    description: string
    method: string
    url: string
    headers?: Record<string, string>
    body?: string
    expectedStatus?: number
  }
  success: boolean
  status: number
  responseTime: number
  error?: string
  response?: any
  payload?: string
}

interface ScenarioAnalysis {
  scenarioName: string
  status: "success" | "failure" | "warning"
  analysis: string
  recommendations: string[]
  performance: {
    rating: "excellent" | "good" | "average" | "poor"
    details: string
  }
  security: {
    level: "secure" | "moderate" | "vulnerable"
    issues: string[]
  }
  businessImpact: string
}

interface AnalysisResult {
  summary: string
  recommendations: string[]
  performance: {
    assessment: string
    suggestions: string[]
  }
  security: {
    issues: string[]
    recommendations: string[]
  }
  reliability: {
    score: number
    issues: string[]
  }
  scenarioAnalyses: ScenarioAnalysis[]
}

export async function POST(request: NextRequest) {
  try {
    const { results, summary } = await request.json()

    if (!results || !Array.isArray(results)) {
      return NextResponse.json({ error: "Résultats de tests requis" }, { status: 400 })
    }

    const prompt = `
VOUS ÊTES UN DOCTEUR EXPERT EN TESTS D'API AVEC 20+ ANS D'EXPÉRIENCE MONDIALE:
- DOCTEUR QA SENIOR: 20+ ans en tests d'API, architecture, sécurité avancée, performance à l'échelle
- EXPERT ANALYSE & RAPPORTS: 20+ ans en diagnostic technique, forensique API, audit de conformité
- CONSULTANT MULTI-DOMAINES: Finance, Santé, E-commerce, IoT, Blockchain, FinTech, HealthTech, etc.

🎯 **MISSION UNIVERSELLE**: Analysez cette API avec votre expertise doctoriale pour N'IMPORTE QUEL DOMAINE MÉTIER

CONTEXTE TECHNIQUE:
- Total: ${summary.total} tests | Réussis: ${summary.passed} | Échoués: ${summary.failed}
- Temps de réponse moyen: ${summary.avgResponseTime}ms
- Taux de succès: ${((summary.passed / summary.total) * 100).toFixed(1)}%

RÉSULTATS DÉTAILLÉS:
${results
  .map(
    (result: TestResult, index: number) => `
═══ TEST ${index + 1}: ${result.scenario.name} ═══
• Description: ${result.scenario.description}
• Endpoint: ${result.scenario.method} ${result.scenario.url}
• Status Code: ${result.status} (attendu: ${result.scenario.expectedStatus || 200})
• Résultat: ${result.success ? "✅ SUCCÈS" : "❌ ÉCHEC"}
• Performance: ${result.responseTime}ms
• Erreur: ${result.error || "Aucune"}
• Payload: ${result.payload ? result.payload.substring(0, 200) + "..." : "Aucun"}
• Réponse: ${typeof result.response === "string" ? result.response.substring(0, 200) + "..." : JSON.stringify(result.response || {}).substring(0, 200) + "..."}
`,
  )
  .join("\n")}

🔬 **ANALYSE DOCTORIALE REQUISE (20+ ANS D'EXPERTISE)**:

**DIAGNOSTIC TECHNIQUE AVANCÉ**:
- Forensique des patterns d'erreur et anti-patterns architecturaux
- Audit sécurité OWASP Top 10, SANS Top 25, ISO 27001, PCI DSS
- Analyse performance: latence P95/P99, throughput, scalabilité horizontale
- Résilience: circuit breakers, retry policies, graceful degradation
- Conformité standards: REST maturity model, OpenAPI 3.0, HTTP/2 optimization

**EXPERTISE MULTI-DOMAINES UNIVERSELLE**:
- **Finance/FinTech**: PCI DSS, SOX compliance, transaction integrity, fraud detection
- **Santé/HealthTech**: HIPAA, FHIR, patient data protection, medical device integration
- **E-commerce**: PCI compliance, inventory consistency, payment gateway integration
- **IoT/Industry 4.0**: MQTT, CoAP, edge computing, device authentication
- **Blockchain/Web3**: Smart contract interaction, wallet integration, consensus mechanisms
- **SaaS/Enterprise**: Multi-tenancy, SSO, RBAC, data sovereignty

**MÉTRIQUES DOCTORIALES**:
- SLA/SLO compliance (99.9%, 99.99%, 99.999%)
- MTTR (Mean Time To Recovery) analysis
- Error budget consumption
- Apdex score calculation
- Business continuity impact assessment

**RECOMMANDATIONS STRATÉGIQUES**:
- Architecture patterns: CQRS, Event Sourcing, Microservices, API Gateway
- Observability: OpenTelemetry, distributed tracing, chaos engineering
- Security: Zero-trust architecture, mTLS, API rate limiting, DDoS protection
- Performance: CDN optimization, database indexing, caching strategies
- Compliance: GDPR, CCPA, SOC 2, ISO certifications

Répondez UNIQUEMENT en JSON valide avec cette structure exacte:
{
  "summary": "Diagnostic doctoral global avec expertise 20+ ans, applicable universellement à tout domaine métier...",
  "recommendations": [
    "Recommandation architecturale critique avec justification technique et business",
    "Action sécurité prioritaire avec conformité réglementaire spécifique"
  ],
  "performance": {
    "assessment": "Évaluation experte avec benchmarks industrie P95/P99, SLA compliance...",
    "suggestions": ["Optimisation technique avec métriques quantifiées et ROI estimé"]
  },
  "security": {
    "issues": ["Vulnérabilité critique avec score CVSS 3.1 et impact métier"],
    "recommendations": ["Correction sécurité avec timeline et effort estimé en story points"]
  },
  "reliability": {
    "score": 7,
    "issues": ["Problème de résilience avec impact MTTR et error budget"]
  },
  "scenarioAnalyses": [
    {
      "scenarioName": "Nom exact du scénario",
      "status": "success|failure|warning",
      "analysis": "Diagnostic technique doctoral + impact métier universel (finance/santé/e-commerce/IoT)...",
      "recommendations": ["Action technique prioritaire avec conformité réglementaire", "Optimisation performance avec métriques SLA"],
      "performance": {
        "rating": "excellent|good|average|poor",
        "details": "Analyse performance doctoriale avec P95/P99, Apdex score, comparaison benchmarks..."
      },
      "security": {
        "level": "secure|moderate|vulnerable",
        "issues": ["Vulnérabilité spécifique avec score CVSS 3.1 et conformité réglementaire"]
      },
      "businessImpact": "Impact métier quantifié universel (revenus, compliance, réputation) avec priorité P0/P1/P2/P3..."
    }
  ]
}

🎯 **EXIGENCES DOCTORIALES (20+ ANS)**:
✅ Terminologie experte: CVSS 3.1, OWASP, SANS, ISO 27001, PCI DSS, HIPAA, GDPR
✅ Métriques avancées: P95/P99, MTTR, SLA/SLO, Apdex, error budget
✅ Architecture patterns: CQRS, Event Sourcing, Circuit Breaker, Bulkhead
✅ Conformité réglementaire selon le domaine détecté
✅ Quantification ROI et impact business précis
✅ Recommandations universelles adaptables à tout métier
✅ Analyse COMPLÈTE des ${results.length} scénarios avec expertise doctoriale

❌ **INTERDICTIONS ABSOLUES**:
❌ Analyses superficielles ou génériques
❌ Recommandations sans justification technique et business
❌ Oubli de la conformité réglementaire du domaine
❌ Métriques approximatives ou non quantifiées
❌ Expertise limitée à un seul domaine métier
`

    const result = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt,
    })

    let analysis: AnalysisResult
    try {
      let jsonString = result.text.trim()

      const introPatterns = [
        /^Here is the JSON response.*?:\s*/i,
        /^Here is.*?:\s*/i,
        /^Based on.*?:\s*/i,
        /^```json\s*/i,
        /^```\s*/i,
      ]

      for (const pattern of introPatterns) {
        jsonString = jsonString.replace(pattern, "")
      }

      const codeBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1].trim()
      }

      const firstBraceIndex = jsonString.indexOf("{")
      if (firstBraceIndex !== -1) {
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

        if (endIndex !== -1) {
          jsonString = jsonString.substring(firstBraceIndex, endIndex + 1)
        }
      }

      analysis = JSON.parse(jsonString)
    } catch (parseError) {
      console.error("Erreur de parsing de l'analyse:", parseError)

      const successRate = (summary.passed / summary.total) * 100
      analysis = {
        summary: `L'API présente un taux de succès de ${successRate.toFixed(1)}% avec ${summary.failed} tests échoués sur ${summary.total}. Le temps de réponse moyen est de ${summary.avgResponseTime}ms.`,
        recommendations: [
          summary.failed > 0
            ? "Corriger les erreurs identifiées dans les tests échoués"
            : "Maintenir la qualité actuelle",
          summary.avgResponseTime > 1000
            ? "Optimiser les performances pour réduire les temps de réponse"
            : "Surveiller les performances",
          "Implémenter une surveillance continue des APIs",
          "Ajouter plus de tests de sécurité",
        ],
        performance: {
          assessment: summary.avgResponseTime > 1000 ? "Performances à améliorer" : "Performances acceptables",
          suggestions: [
            "Mettre en place un cache pour les requêtes fréquentes",
            "Optimiser les requêtes de base de données",
            "Utiliser la compression des réponses",
          ],
        },
        security: {
          issues: results.some((r: TestResult) => r.status === 401) ? ["Problèmes d'authentification détectés"] : [],
          recommendations: [
            "Implémenter une validation stricte des entrées",
            "Utiliser HTTPS pour toutes les communications",
            "Mettre en place un rate limiting",
          ],
        },
        reliability: {
          score: Math.max(1, Math.min(10, Math.round(successRate / 10))),
          issues: summary.failed > 0 ? [`${summary.failed} tests échoués nécessitent une attention`] : [],
        },
        scenarioAnalyses: results.map((result: TestResult) => ({
          scenarioName: result.scenario.name,
          status: result.success ? "success" : ("failure" as "success" | "failure" | "warning"),
          analysis: result.success
            ? `Test réussi avec un temps de réponse de ${result.responseTime}ms. Le comportement correspond aux attentes.`
            : `Test échoué: ${result.error || "Erreur inconnue"}. Status reçu: ${result.status}, attendu: ${result.scenario.expectedStatus || 200}.`,
          recommendations: result.success
            ? ["Maintenir ce niveau de qualité", "Surveiller les performances"]
            : [
                "Corriger l'erreur identifiée",
                "Vérifier la logique métier",
                "Tester en environnement de développement",
              ],
          performance: {
            rating:
              result.responseTime < 200
                ? "excellent"
                : result.responseTime < 500
                  ? "good"
                  : result.responseTime < 1000
                    ? "average"
                    : ("poor" as "excellent" | "good" | "average" | "poor"),
            details: `Temps de réponse: ${result.responseTime}ms`,
          },
          security: {
            level:
              result.status === 401
                ? "vulnerable"
                : result.success
                  ? "secure"
                  : ("moderate" as "secure" | "moderate" | "vulnerable"),
            issues: result.status === 401 ? ["Problème d'authentification"] : [],
          },
          businessImpact: result.success
            ? "Fonctionnalité opérationnelle, impact positif sur l'expérience utilisateur"
            : "Dysfonctionnement pouvant impacter l'expérience utilisateur et les processus métier",
        })),
      }
    }

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error("Erreur lors de l'analyse:", error)
    return NextResponse.json(
      { error: `Erreur lors de l'analyse: ${error instanceof Error ? error.message : "Erreur inconnue"}` },
      { status: 500 },
    )
  }
}
