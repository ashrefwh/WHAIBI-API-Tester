"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  TestTube,
  AlertCircle,
  CheckCircle,
  XCircle,
  Brain,
  TrendingUp,
  Shield,
  Activity,
  RotateCcw,
  Plus,
  Trash2,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

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
  payload?: string // Added payload field to capture request data
}

interface TestReport {
  scenarios: TestScenario[]
  results: TestResult[]
  summary: {
    total: number
    passed: number
    failed: number
    avgResponseTime: number
  }
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

interface StaticAttribute {
  name: string
  value: string
}

export default function APITester() {
  const [curlCommand, setCurlCommand] = useState("")
  const [explanation, setExplanation] = useState("")
  const [staticAttributes, setStaticAttributes] = useState<StaticAttribute[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [scenarios, setScenarios] = useState<TestScenario[]>([])
  const [report, setReport] = useState<TestReport | null>(null)
  const [error, setError] = useState("")
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const addStaticAttribute = () => {
    setStaticAttributes([...staticAttributes, { name: "", value: "" }])
  }

  const removeStaticAttribute = (index: number) => {
    setStaticAttributes(staticAttributes.filter((_, i) => i !== index))
  }

  const updateStaticAttribute = (index: number, field: "name" | "value", value: string) => {
    const updated = [...staticAttributes]
    updated[index][field] = value
    setStaticAttributes(updated)
  }

  const resetAllStates = () => {
    console.log("[v0] Resetting all states for new cURL test")
    setScenarios([])
    setReport(null)
    setAnalysis(null)
    setError("")
    setIsGenerating(false)
    setIsAnalyzing(false)
  }

  const generateAndRunTests = async () => {
    if (!curlCommand.trim()) {
      setError("Veuillez entrer une commande cURL")
      return
    }

    if (!explanation.trim()) {
      setError("Veuillez ajouter une explication pour aider l'IA à comprendre le contexte")
      return
    }

    const validStaticAttributes = staticAttributes.filter((attr) => attr.name.trim() && attr.value.trim())

    console.log("[v0] Starting new API test - resetting all previous states")

    resetAllStates()
    setIsGenerating(true)

    try {
      console.log("[v0] Generating scenarios for new cURL...")
      const scenarioResponse = await fetch("/api/generate-scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          curlCommand,
          explanation,
          staticAttributes: validStaticAttributes,
        }),
      })

      if (!scenarioResponse.ok) {
        throw new Error("Erreur lors de la génération des scénarios")
      }

      const scenarioData = await scenarioResponse.json()
      console.log("[v0] Generated", scenarioData.scenarios.length, "scenarios")
      setScenarios(scenarioData.scenarios)

      console.log("[v0] Running tests for generated scenarios...")
      const testResponse = await fetch("/api/run-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarios: scenarioData.scenarios }),
      })

      if (!testResponse.ok) {
        throw new Error("Erreur lors de l'exécution des tests")
      }

      const testData = await testResponse.json()
      console.log(
        "[v0] Tests completed - passed:",
        testData.report.summary.passed,
        "failed:",
        testData.report.summary.failed,
      )
      setReport(testData.report)
    } catch (err) {
      console.error("[v0] Error during test execution:", err)
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setIsGenerating(false)
    }
  }

  const analyzeResults = async () => {
    if (!report) return

    console.log("[v0] Starting AI analysis of test results")
    setIsAnalyzing(true)
    setError("")

    try {
      const response = await fetch("/api/analyze-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          results: report.results,
          summary: report.summary,
        }),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de l'analyse des résultats")
      }

      const data = await response.json()
      console.log("[v0] AI analysis completed successfully")
      setAnalysis(data.analysis)
    } catch (err) {
      console.error("[v0] Error during AI analysis:", err)
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleManualReset = () => {
    console.log("[v0] Manual reset triggered by user")
    resetAllStates()
    setCurlCommand("")
    setExplanation("")
    setStaticAttributes([])
  }

  const getStatusIcon = (success: boolean) => {
    return success ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />
  }

  const getReliabilityColor = (score: number) => {
    if (score >= 8) return "text-green-500"
    if (score >= 6) return "text-yellow-500"
    return "text-red-500"
  }

  const getStatusBadgeVariant = (status: "success" | "failure" | "warning") => {
    switch (status) {
      case "success":
        return "default"
      case "failure":
        return "destructive"
      case "warning":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getPerformanceColor = (rating: "excellent" | "good" | "average" | "poor") => {
    switch (rating) {
      case "excellent":
        return "text-green-600"
      case "good":
        return "text-blue-600"
      case "average":
        return "text-yellow-600"
      case "poor":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  const getSecurityColor = (level: "secure" | "moderate" | "vulnerable") => {
    switch (level) {
      case "secure":
        return "text-green-600"
      case "moderate":
        return "text-yellow-600"
      case "vulnerable":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">WHAIBI API Tester avec IA</h1>
          <p className="text-muted-foreground">Générez et exécutez automatiquement des tests pour vos APIs IA</p>
        </div>

        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Commande cURL
            </CardTitle>
            <CardDescription>
              Collez votre commande cURL et ajoutez une explication pour générer des tests plus précis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="curl -X GET 'https://api.example.com/users' -H 'Authorization: Bearer token123'"
              value={curlCommand}
              onChange={(e) => setCurlCommand(e.target.value)}
              className="min-h-[100px] font-mono text-sm"
            />

            {/* Explanation textarea field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Explication / Remarques <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Exemple: Cette API d'inscription d'entreprise accepte les types 'IT_SERVICES_COMPANY' ou 'END_CLIENT'. Le champ email doit être unique. Les mots de passe doivent contenir au moins 8 caractères avec majuscules, minuscules et chiffres."
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                className="min-h-[80px] text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Aidez l'IA à mieux comprendre votre API : types de données acceptés, contraintes de validation, règles
                métier, etc.
              </p>
            </div>

            {/* Static Attributes Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Attributs statiques (optionnel)</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addStaticAttribute}
                  className="flex items-center gap-1 bg-transparent"
                >
                  <Plus className="h-3 w-3" />
                  Ajouter
                </Button>
              </div>

              {staticAttributes.length > 0 && (
                <div className="space-y-2">
                  {staticAttributes.map((attr, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder="Nom de l'attribut (ex: companyType)"
                        value={attr.name}
                        onChange={(e) => updateStaticAttribute(index, "name", e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Valeur statique (ex: IT_SERVICES_COMPANY)"
                        value={attr.value}
                        onChange={(e) => updateStaticAttribute(index, "value", e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeStaticAttribute(index)}
                        className="px-2"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Spécifiez les champs qui doivent avoir des valeurs fixes dans tous les scénarios de test. L'IA utilisera
                exactement ces valeurs et ne générera pas d'alternatives.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={generateAndRunTests}
                disabled={isGenerating || !curlCommand.trim() || !explanation.trim()}
                className="flex items-center gap-2"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                {isGenerating ? "Génération et exécution en cours..." : "Générer et exécuter les tests"}
              </Button>

              {(scenarios.length > 0 || report || analysis) && (
                <Button
                  onClick={handleManualReset}
                  variant="outline"
                  className="flex items-center gap-2 bg-transparent"
                  disabled={isGenerating || isAnalyzing}
                >
                  <RotateCcw className="h-4 w-4" />
                  Nouveau test
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {(scenarios.length > 0 || report) && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <TestTube className="h-4 w-4" />
                <span className="font-medium">Test en cours pour:</span>
                <code className="bg-blue-100 px-2 py-1 rounded text-xs">
                  {curlCommand.length > 80 ? curlCommand.substring(0, 80) + "..." : curlCommand}
                </code>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scenarios Section */}
        {scenarios.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Scénarios générés et testés ({scenarios.length})</CardTitle>
              <CardDescription>Scénarios de test générés automatiquement par l'IA et exécutés</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {scenarios.map((scenario, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{scenario.name}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{scenario.method}</Badge>
                        {scenario.expectedStatus && (
                          <Badge variant="secondary" className="text-xs">
                            {scenario.expectedStatus}
                          </Badge>
                        )}
                        {report && report.results[index] && getStatusIcon(report.results[index].success)}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{scenario.description}</p>
                    <p className="text-xs font-mono bg-muted p-2 rounded">{scenario.url}</p>

                    {scenario.body && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Payload:</p>
                        <div className="text-xs font-mono bg-blue-50 border border-blue-200 p-2 rounded max-h-20 overflow-auto">
                          {(() => {
                            try {
                              return JSON.stringify(JSON.parse(scenario.body), null, 2)
                            } catch {
                              return scenario.body
                            }
                          })()}
                        </div>
                      </div>
                    )}

                    {scenario.headers && Object.keys(scenario.headers).length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Headers clés:</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(scenario.headers)
                            .slice(0, 3)
                            .map(([key, value]) => (
                              <Badge key={key} variant="outline" className="text-xs">
                                {key}:{" "}
                                {typeof value === "string" && value.length > 20
                                  ? value.substring(0, 20) + "..."
                                  : value}
                              </Badge>
                            ))}
                          {Object.keys(scenario.headers).length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{Object.keys(scenario.headers).length - 3} autres
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {report && (
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Résultats d'exécution</CardTitle>
                  <Button
                    onClick={analyzeResults}
                    disabled={isAnalyzing}
                    variant="outline"
                    className="flex items-center gap-2 bg-transparent"
                  >
                    {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                    {isAnalyzing ? "Analyse en cours..." : "Analyse des résultats et suggestions IA"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{report.summary.total}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">{report.summary.passed}</div>
                    <div className="text-sm text-muted-foreground">Réussis</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-500">{report.summary.failed}</div>
                    <div className="text-sm text-muted-foreground">Échoués</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{report.summary.avgResponseTime}ms</div>
                    <div className="text-sm text-muted-foreground">Temps moyen</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Analysis Section */}
            {analysis && (
              <div className="space-y-6">
                {/* Global Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      Analyse IA Globale et Recommandations
                    </CardTitle>
                    <CardDescription>
                      Analyse intelligente globale des résultats avec suggestions d'amélioration
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Summary */}
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Résumé de l'analyse</h4>
                      <p className="text-sm">{analysis.summary}</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Performance */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-blue-500" />
                          <h4 className="font-semibold">Performance</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">{analysis.performance.assessment}</p>
                        <ul className="space-y-1">
                          {analysis.performance.suggestions.map((suggestion, index) => (
                            <li key={index} className="text-sm flex items-start gap-2">
                              <span className="text-blue-500 mt-1">•</span>
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Security */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-orange-500" />
                          <h4 className="font-semibold">Sécurité</h4>
                        </div>
                        {analysis.security.issues.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-red-600 mb-1">Problèmes détectés:</p>
                            <ul className="space-y-1">
                              {analysis.security.issues.map((issue, index) => (
                                <li key={index} className="text-sm flex items-start gap-2">
                                  <span className="text-red-500 mt-1">⚠</span>
                                  {issue}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium mb-1">Recommandations:</p>
                          <ul className="space-y-1">
                            {analysis.security.recommendations.map((rec, index) => (
                              <li key={index} className="text-sm flex items-start gap-2">
                                <span className="text-orange-500 mt-1">•</span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Reliability and Recommendations */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-green-500" />
                          <h4 className="font-semibold">Fiabilité</h4>
                          <Badge variant="outline" className={getReliabilityColor(analysis.reliability.score)}>
                            {analysis.reliability.score}/10
                          </Badge>
                        </div>
                        {analysis.reliability.issues.length > 0 && (
                          <ul className="space-y-1">
                            {analysis.reliability.issues.map((issue, index) => (
                              <li key={index} className="text-sm flex items-start gap-2">
                                <span className="text-yellow-500 mt-1">⚠</span>
                                {issue}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-semibold">Recommandations prioritaires</h4>
                        <ul className="space-y-2">
                          {analysis.recommendations.map((rec, index) => (
                            <li key={index} className="text-sm flex items-start gap-2">
                              <span className="text-green-500 mt-1 font-bold">{index + 1}.</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {analysis.scenarioAnalyses && analysis.scenarioAnalyses.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TestTube className="h-5 w-5" />
                        Analyse Détaillée par Scénario
                      </CardTitle>
                      <CardDescription>
                        Analyse individuelle et recommandations spécifiques pour chaque scénario de test
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {analysis.scenarioAnalyses.map((scenarioAnalysis, index) => (
                          <div key={index} className="border rounded-lg p-4 space-y-4">
                            {/* Scenario Header */}
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-lg">{scenarioAnalysis.scenarioName}</h4>
                              <div className="flex items-center gap-2">
                                <Badge variant={getStatusBadgeVariant(scenarioAnalysis.status)}>
                                  {scenarioAnalysis.status === "success"
                                    ? "Succès"
                                    : scenarioAnalysis.status === "failure"
                                      ? "Échec"
                                      : "Attention"}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={getPerformanceColor(scenarioAnalysis.performance.rating)}
                                >
                                  {scenarioAnalysis.performance.rating}
                                </Badge>
                                <Badge variant="outline" className={getSecurityColor(scenarioAnalysis.security.level)}>
                                  {scenarioAnalysis.security.level}
                                </Badge>
                              </div>
                            </div>

                            {/* Analysis */}
                            <div className="bg-muted p-3 rounded-lg">
                              <h5 className="font-medium mb-2">Analyse</h5>
                              <p className="text-sm">{scenarioAnalysis.analysis}</p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                              {/* Performance & Business Impact */}
                              <div className="space-y-3">
                                <div>
                                  <h5 className="font-medium mb-2 flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4" />
                                    Performance
                                  </h5>
                                  <p className="text-sm text-muted-foreground">
                                    {scenarioAnalysis.performance.details}
                                  </p>
                                </div>

                                <div>
                                  <h5 className="font-medium mb-2">Impact Métier</h5>
                                  <p className="text-sm text-muted-foreground">{scenarioAnalysis.businessImpact}</p>
                                </div>
                              </div>

                              {/* Security & Recommendations */}
                              <div className="space-y-3">
                                <div>
                                  <h5 className="font-medium mb-2 flex items-center gap-2">
                                    <Shield className="h-4 w-4" />
                                    Sécurité
                                  </h5>
                                  {scenarioAnalysis.security.issues.length > 0 ? (
                                    <ul className="space-y-1">
                                      {scenarioAnalysis.security.issues.map((issue, issueIndex) => (
                                        <li key={issueIndex} className="text-sm flex items-start gap-2">
                                          <span className="text-red-500 mt-1">⚠</span>
                                          {issue}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-sm text-green-600">Aucun problème de sécurité détecté</p>
                                  )}
                                </div>

                                <div>
                                  <h5 className="font-medium mb-2">Recommandations</h5>
                                  <ul className="space-y-1">
                                    {scenarioAnalysis.recommendations.map((rec, recIndex) => (
                                      <li key={recIndex} className="text-sm flex items-start gap-2">
                                        <span className="text-blue-500 mt-1">•</span>
                                        {rec}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Detailed Results */}
            <Card>
              <CardHeader>
                <CardTitle>Résultats détaillés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {report.results.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(result.success)}
                          <h4 className="font-semibold">{result.scenario.name}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={result.success ? "default" : "destructive"}>{result.status}</Badge>
                          <span className="text-sm text-muted-foreground">{result.responseTime}ms</span>
                        </div>
                      </div>

                      {result.error && (
                        <Alert variant="destructive">
                          <AlertDescription className="text-sm">{result.error}</AlertDescription>
                        </Alert>
                      )}

                      <div className="grid md:grid-cols-2 gap-4">
                        {/* Request Details */}
                        <div className="space-y-2">
                          <h5 className="font-medium text-sm">Requête</h5>
                          <div className="bg-muted p-3 rounded text-xs space-y-2">
                            <div>
                              <strong>Méthode:</strong> {result.scenario.method}
                            </div>
                            <div>
                              <strong>URL:</strong> {result.scenario.url}
                            </div>
                            {result.scenario.headers && Object.keys(result.scenario.headers).length > 0 && (
                              <div>
                                <strong>Headers:</strong>
                                <pre className="mt-1 text-xs overflow-auto">
                                  {JSON.stringify(result.scenario.headers, null, 2)}
                                </pre>
                              </div>
                            )}
                            {result.payload && (
                              <div>
                                <strong>Payload:</strong>
                                <pre className="mt-1 text-xs overflow-auto max-h-32">
                                  {typeof result.payload === "string"
                                    ? result.payload
                                    : JSON.stringify(JSON.parse(result.payload), null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Response Details */}
                        <div className="space-y-2">
                          <h5 className="font-medium text-sm">Réponse</h5>
                          <div className="bg-muted p-3 rounded text-xs space-y-2">
                            <div>
                              <strong>Status:</strong> {result.status}
                            </div>
                            <div>
                              <strong>Temps de réponse:</strong> {result.responseTime}ms
                            </div>
                            {result.response && (
                              <div>
                                <strong>Données:</strong>
                                <pre className="mt-1 text-xs overflow-auto max-h-32">
                                  {typeof result.response === "string"
                                    ? result.response
                                    : JSON.stringify(result.response, null, 2)}
                                </pre>
                              </div>
                            )}
                            {result.error && (
                              <div>
                                <strong>Erreur:</strong>
                                <div className="text-red-600 mt-1">{result.error}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
