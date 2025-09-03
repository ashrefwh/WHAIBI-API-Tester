import { type NextRequest, NextResponse } from "next/server"

interface TestScenario {
  name: string
  description: string
  method: string
  url: string
  headers?: Record<string, string>
  body?: string
  expectedStatus?: number
}

interface TestResult {
  scenario: TestScenario
  success: boolean
  status: number
  responseTime: number
  error?: string
  response?: any
  payload?: string
}

async function executeTest(scenario: TestScenario): Promise<TestResult> {
  const startTime = Date.now()

  try {
    const requestOptions: RequestInit = {
      method: scenario.method,
      headers: {
        "User-Agent": "API-Tester/1.0",
        Accept: "application/json, text/plain, */*",
        ...scenario.headers,
      },
    }

    let payload: string | undefined
    if (scenario.body) {
      payload = scenario.body

      let isJsonBody = false
      try {
        JSON.parse(scenario.body)
        isJsonBody = true
      } catch {}

      if (!requestOptions.headers!["Content-Type"] && !requestOptions.headers!["content-type"]) {
        if (isJsonBody) {
          ;(requestOptions.headers as Record<string, string>)["Content-Type"] = "application/json"
        } else if (scenario.body.includes("=") && scenario.body.includes("&")) {
          ;(requestOptions.headers as Record<string, string>)["Content-Type"] = "application/x-www-form-urlencoded"
        } else {
          ;(requestOptions.headers as Record<string, string>)["Content-Type"] = "text/plain"
        }
      }

      requestOptions.body = scenario.body
    }

    const finalUrl = scenario.url
    try {
      new URL(finalUrl)
    } catch {
      throw new Error(`URL invalide: ${finalUrl}`)
    }

    const response = await fetch(finalUrl, requestOptions)
    const responseTime = Date.now() - startTime

    let responseData
    try {
      const text = await response.text()
      try {
        responseData = text ? JSON.parse(text) : null
      } catch {
        responseData = text
      }
    } catch (error) {
      responseData = `Erreur de lecture de la réponse: ${error instanceof Error ? error.message : "Erreur inconnue"}`
    }

    let expectedStatus = scenario.expectedStatus
    if (!expectedStatus) {
      switch (scenario.method) {
        case "POST":
          expectedStatus = 201
          break
        case "PUT":
        case "PATCH":
          expectedStatus = 200
          break
        case "DELETE":
          expectedStatus = 204
          break
        default:
          expectedStatus = 200
      }
    }

    const success = response.status === expectedStatus

    return {
      scenario,
      success,
      status: response.status,
      responseTime,
      response: responseData,
      payload,
    }
  } catch (error) {
    const responseTime = Date.now() - startTime

    return {
      scenario,
      success: false,
      status: 0,
      responseTime,
      error: error instanceof Error ? error.message : "Erreur inconnue",
      payload: scenario.body,
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { scenarios } = await request.json()

    if (!scenarios || !Array.isArray(scenarios)) {
      return NextResponse.json({ error: "Scénarios requis" }, { status: 400 })
    }

    const results = await Promise.all(scenarios.map((scenario) => executeTest(scenario)))

    const total = results.length
    const passed = results.filter((r) => r.success).length
    const failed = total - passed
    const avgResponseTime = Math.round(results.reduce((sum, r) => sum + r.responseTime, 0) / total)

    const report = {
      scenarios,
      results,
      summary: {
        total,
        passed,
        failed,
        avgResponseTime,
      },
    }

    return NextResponse.json({ report })
  } catch (error) {
    console.error("Erreur lors de l'exécution des tests:", error)
    return NextResponse.json({ error: "Erreur lors de l'exécution des tests" }, { status: 500 })
  }
}
