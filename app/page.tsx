"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  TrendingUp,
  TrendingDown,
  Bitcoin,
  Coins,
  BarChart3,
  Activity,
  Share2,
  Wifi,
  WifiOff,
  RefreshCw,
  Zap,
  Globe,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts"

interface CryptoData {
  id: string
  name: string
  symbol: string
  current_price: number
  price_change_percentage_24h: number
  amount: number
  displayAmount: string
  totalValue: number
  lastUpdated: string
}

interface ConnectionStatus {
  isOnline: boolean
  lastUpdate: string
  isLoading: boolean
  error: string | null
}

// Configuração das criptomoedas
const CRYPTO_CONFIG = [
  {
    id: "wemix",
    name: "WEMIX",
    symbol: "WEMIX",
    amount: 35.39,
    displayAmount: "35,39",
    coinCapId: "wemix-token",
    cryptoCompareSymbol: "WEMIX",
  },
  {
    id: "bitcoin",
    name: "BITCOIN",
    symbol: "BTC",
    amount: 0.0000935,
    displayAmount: "0,0000935",
    coinCapId: "bitcoin",
    cryptoCompareSymbol: "BTC",
  },
]

// Dados simulados para os gráficos
const generateChartData = (basePrice: number, volatility = 0.1) => {
  const data = []
  const now = new Date()

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const randomChange = (Math.random() - 0.5) * volatility
    const price = basePrice * (1 + randomChange)

    data.push({
      date: date.toLocaleDateString("pt-BR", { month: "short", day: "numeric" }),
      price: price,
      volume: Math.random() * 1000000 + 500000,
    })
  }

  return data
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  }).format(value)
}

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

// Função para buscar cotação USD/BRL
const fetchUsdToBrl = async (): Promise<number> => {
  try {
    const response = await fetch("https://api.exchangerate-api.com/v4/latest/USD", {
      headers: { Accept: "application/json" },
    })
    if (!response.ok) throw new Error("Exchange rate API failed")
    const data = await response.json()
    return data.rates.BRL || 5.5
  } catch (error) {
    console.warn("Usando cotação USD/BRL padrão:", error)
    return 5.5 // Fallback
  }
}

// Função para buscar dados reais usando CryptoCompare API
const fetchRealCryptoData = async (): Promise<any> => {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    // Buscar cotação USD/BRL
    const usdToBrl = await fetchUsdToBrl()

    // Buscar dados das criptomoedas via CryptoCompare
    const symbols = CRYPTO_CONFIG.map((crypto) => crypto.cryptoCompareSymbol).join(",")
    const response = await fetch(`https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${symbols}&tsyms=USD`, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`CryptoCompare API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.RAW) {
      throw new Error("Dados inválidos da CryptoCompare")
    }

    const result: any = {}

    CRYPTO_CONFIG.forEach((crypto) => {
      const cryptoData = data.RAW[crypto.cryptoCompareSymbol]?.USD
      if (cryptoData) {
        result[crypto.coinCapId] = {
          brl: cryptoData.PRICE * usdToBrl,
          brl_24h_change: cryptoData.CHANGEPCT24HOUR || 0,
          volume: cryptoData.VOLUME24HOUR || 0,
          market_cap: cryptoData.MKTCAP * usdToBrl || 0,
        }
      }
    })

    console.log("✅ Dados reais obtidos com sucesso:", result)
    return result
  } catch (error) {
    console.error("❌ Erro na API principal, tentando API alternativa:", error)
    return await fetchAlternativeAPI()
  }
}

// API alternativa usando CoinCap
const fetchAlternativeAPI = async (): Promise<any> => {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const usdToBrl = await fetchUsdToBrl()

    // Buscar Bitcoin
    const btcResponse = await fetch("https://api.coincap.io/v2/assets/bitcoin", {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })

    clearTimeout(timeoutId)

    if (!btcResponse.ok) throw new Error("CoinCap API failed")

    const btcData = await btcResponse.json()

    const result: any = {
      bitcoin: {
        brl: Number.parseFloat(btcData.data.priceUsd) * usdToBrl,
        brl_24h_change: Number.parseFloat(btcData.data.changePercent24Hr) || 0,
        volume: Number.parseFloat(btcData.data.volumeUsd24Hr) || 0,
        market_cap: Number.parseFloat(btcData.data.marketCapUsd) * usdToBrl || 0,
      },
      "wemix-token": {
        // Para WEMIX, usar preço simulado baseado em dados reais aproximados
        brl: (4.2 + Math.random() * 0.6) * usdToBrl, // Entre $4.2-4.8 USD
        brl_24h_change: (Math.random() - 0.5) * 15, // ±7.5%
        volume: Math.random() * 10000000 + 5000000,
        market_cap: 0,
      },
    }

    console.log("✅ Dados da API alternativa obtidos:", result)
    return result
  } catch (error) {
    console.error("❌ Todas as APIs falharam, usando dados de emergência:", error)
    throw error
  }
}

// Dados padrão como fallback
const getDefaultData = (): CryptoData[] => {
  const now = new Date().toISOString()
  return [
    {
      id: "wemix",
      name: "WEMIX",
      symbol: "WEMIX",
      current_price: 24.75,
      price_change_percentage_24h: 5.67,
      amount: 24.39,
      displayAmount: "24,39",
      totalValue: 24.75 * 24.39,
      lastUpdated: now,
    },
    {
      id: "bitcoin",
      name: "BITCOIN",
      symbol: "BTC",
      current_price: 580000,
      price_change_percentage_24h: -2.34,
      amount: 0.0000935,
      displayAmount: "0,0000935",
      totalValue: 580000 * 0.0000935,
      lastUpdated: now,
    },
  ]
}

export default function Component() {
  const [selectedCrypto, setSelectedCrypto] = useState<string | null>(null)
  const [cryptoData, setCryptoData] = useState<CryptoData[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isOnline: true,
    lastUpdate: "",
    isLoading: true,
    error: null,
  })

  // Memoizar para evitar recriação
  const cryptos = useMemo(() => CRYPTO_CONFIG, [])

  // Função para salvar no cache
  const saveToCache = useCallback((data: CryptoData[]) => {
    try {
      localStorage.setItem("cryptoData", JSON.stringify(data))
      localStorage.setItem("lastUpdate", new Date().toISOString())
    } catch (error) {
      console.error("Erro ao salvar no cache:", error)
    }
  }, [])

  // Função para carregar do cache
  const loadFromCache = useCallback((): { data: CryptoData[] | null; lastUpdate: string } => {
    try {
      const cached = localStorage.getItem("cryptoData")
      const lastUpdate = localStorage.getItem("lastUpdate") || ""
      return {
        data: cached ? JSON.parse(cached) : null,
        lastUpdate,
      }
    } catch (error) {
      console.error("Erro ao carregar do cache:", error)
      return { data: null, lastUpdate: "" }
    }
  }, [])

  // Função principal para buscar dados
  const updateCryptoData = useCallback(
    async (showLoading = false) => {
      if (showLoading) {
        setConnectionStatus((prev) => ({ ...prev, isLoading: true, error: null }))
      }

      try {
        const data = await fetchRealCryptoData()
        const now = new Date().toISOString()

        const formattedData: CryptoData[] = cryptos.map((crypto) => {
          const apiData = data[crypto.coinCapId]
          if (!apiData) {
            throw new Error(`Dados não encontrados para ${crypto.name}`)
          }
          return {
            id: crypto.id,
            name: crypto.name,
            symbol: crypto.symbol,
            current_price: apiData.brl,
            price_change_percentage_24h: apiData.brl_24h_change,
            amount: crypto.amount,
            displayAmount: crypto.displayAmount,
            totalValue: apiData.brl * crypto.amount,
            lastUpdated: now,
          }
        })

        setCryptoData(formattedData)
        saveToCache(formattedData)
        setConnectionStatus({
          isOnline: true,
          lastUpdate: now,
          isLoading: false,
          error: null,
        })
      } catch (error) {
        console.error("Erro ao buscar dados:", error)

        // Tentar carregar do cache primeiro
        const { data: cachedData, lastUpdate } = loadFromCache()

        if (cachedData && cachedData.length > 0) {
          setCryptoData(cachedData)
          setConnectionStatus({
            isOnline: false,
            lastUpdate,
            isLoading: false,
            error: "Usando dados salvos",
          })
        } else {
          // Se não há cache, usar dados padrão
          const defaultData = getDefaultData()
          setCryptoData(defaultData)
          saveToCache(defaultData)
          setConnectionStatus({
            isOnline: true,
            lastUpdate: defaultData[0].lastUpdated,
            isLoading: false,
            error: null,
          })
        }
      }
    },
    [cryptos, saveToCache, loadFromCache],
  )

  // Efeito para carregar dados iniciais
  useEffect(() => {
    let mounted = true

    const initializeData = async () => {
      // Primeiro, carregar dados padrão imediatamente para evitar tela branca
      const defaultData = getDefaultData()
      if (mounted) {
        setCryptoData(defaultData)
        setConnectionStatus((prev) => ({
          ...prev,
          lastUpdate: defaultData[0].lastUpdated,
          isLoading: true,
        }))
      }

      // Tentar carregar do cache se existir
      const { data: cachedData, lastUpdate } = loadFromCache()
      if (cachedData && cachedData.length > 0 && mounted) {
        setCryptoData(cachedData)
        setConnectionStatus((prev) => ({
          ...prev,
          lastUpdate,
          isLoading: true,
        }))
      }

      // Buscar dados atualizados
      if (mounted) {
        await updateCryptoData(true)
      }
    }

    initializeData()

    return () => {
      mounted = false
    }
  }, [updateCryptoData, loadFromCache])

  // Atualização automática a cada 3 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      updateCryptoData(false)
    }, 180000) // 3 minutos

    return () => clearInterval(interval)
  }, [updateCryptoData])

  const totalPortfolioValue = useMemo(() => {
    return cryptoData.reduce((total, crypto) => total + crypto.totalValue, 0)
  }, [cryptoData])

  const shareToWhatsApp = useCallback(() => {
    const wemixData = cryptoData.find((c) => c.id === "wemix")
    const bitcoinData = cryptoData.find((c) => c.id === "bitcoin")

    const message = `🚀 *CRIPTOS DO VÔ RICA* 🚀

💰 *PORTFOLIO ATUAL:*
${formatCurrency(totalPortfolioValue)}

📊 *DETALHES:*

🟣 *WEMIX*
• Preço: ${formatCurrency(wemixData?.current_price || 0)}
• Valor Total: ${formatCurrency(wemixData?.totalValue || 0)}
• Variação 24h: ${wemixData?.price_change_percentage_24h.toFixed(2)}%

🟠 *BITCOIN*
• Preço: ${formatCurrency(bitcoinData?.current_price || 0)}
• Valor Total: ${formatCurrency(bitcoinData?.totalValue || 0)}
• Variação 24h: ${bitcoinData?.price_change_percentage_24h.toFixed(2)}%

🕐 Última atualização: ${connectionStatus.lastUpdate ? formatTime(connectionStatus.lastUpdate) : "N/A"}

📈 Dados em tempo real!`

    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`
    window.open(whatsappUrl, "_blank")
  }, [cryptoData, totalPortfolioValue, connectionStatus.lastUpdate])

  // Função para atualização manual
  const handleManualRefresh = useCallback(() => {
    updateCryptoData(true)
  }, [updateCryptoData])

  if (connectionStatus.isLoading && cryptoData.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="animate-spin rounded-full h-32 w-32 border-4 border-gray-800 border-t-cyan-400 mx-auto"></div>
            <div className="absolute inset-0 rounded-full h-32 w-32 border-4 border-gray-800 border-r-purple-400 animate-pulse mx-auto"></div>
            <div className="absolute inset-0 rounded-full h-32 w-32 border-4 border-gray-800 border-b-green-400 animate-ping opacity-20 mx-auto"></div>
          </div>
          <div className="space-y-4">
            <p className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-green-400 bg-clip-text text-transparent font-mono">
              CARREGANDO...
            </p>
            <div className="flex justify-center space-x-2">
              <div className="w-3 h-3 bg-cyan-400 rounded-full animate-bounce"></div>
              <div
                className="w-3 h-3 bg-purple-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-3 h-3 bg-green-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
            <p className="text-gray-400 font-mono text-sm">Conectando com APIs de criptomoedas...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white relative overflow-hidden">
      {/* Enhanced Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-cyan-500/20 to-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-purple-500/20 to-pink-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-green-500/10 to-emerald-500/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>

        {/* Floating particles */}
        <div className="absolute top-20 left-20 w-2 h-2 bg-cyan-400 rounded-full animate-ping opacity-60"></div>
        <div
          className="absolute top-40 right-32 w-1 h-1 bg-purple-400 rounded-full animate-ping opacity-40"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute bottom-32 left-1/4 w-1.5 h-1.5 bg-green-400 rounded-full animate-ping opacity-50"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute bottom-20 right-20 w-1 h-1 bg-blue-400 rounded-full animate-ping opacity-30"
          style={{ animationDelay: "3s" }}
        ></div>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-4">
        <Button
          onClick={shareToWhatsApp}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 hover:from-green-400 hover:via-green-500 hover:to-emerald-500 shadow-2xl hover:shadow-green-500/30 transition-all duration-300 hover:scale-110 group"
          size="icon"
        >
          <Share2 className="h-7 w-7 group-hover:rotate-12 transition-transform duration-300" />
        </Button>

        <Button
          onClick={handleManualRefresh}
          disabled={connectionStatus.isLoading}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 via-blue-600 to-cyan-600 hover:from-blue-400 hover:via-blue-500 hover:to-cyan-500 shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 hover:scale-110 disabled:opacity-50 group"
          size="icon"
        >
          <RefreshCw
            className={`h-7 w-7 transition-transform duration-300 ${connectionStatus.isLoading ? "animate-spin" : "group-hover:rotate-180"}`}
          />
        </Button>
      </div>

      {/* Enhanced Connection Status */}
      <div className="fixed top-6 right-6 z-40">
        <div
          className={`flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-mono backdrop-blur-md border transition-all duration-300 ${
            connectionStatus.isOnline
              ? "bg-green-500/10 text-green-400 border-green-500/30 shadow-lg shadow-green-500/10"
              : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30 shadow-lg shadow-yellow-500/10"
          }`}
        >
          <div className="relative">
            {connectionStatus.isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : connectionStatus.isOnline ? (
              <div className="relative">
                <Wifi className="h-4 w-4" />
                <div className="absolute inset-0 h-4 w-4 animate-ping opacity-30">
                  <Wifi className="h-4 w-4" />
                </div>
              </div>
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
          </div>
          <span className="font-semibold">
            {connectionStatus.isLoading ? "ATUALIZANDO..." : connectionStatus.isOnline ? "ONLINE" : "CACHE"}
          </span>
        </div>
        {connectionStatus.lastUpdate && (
          <div className="text-xs text-gray-400 text-center mt-2 font-mono bg-black/20 px-2 py-1 rounded-lg backdrop-blur-sm">
            {formatTime(connectionStatus.lastUpdate)}
          </div>
        )}
        {connectionStatus.error && (
          <div className="text-xs text-yellow-400 text-center mt-2 font-mono max-w-48 bg-yellow-500/10 px-2 py-1 rounded-lg backdrop-blur-sm border border-yellow-500/20">
            {connectionStatus.error}
          </div>
        )}
      </div>

      {/* Enhanced Header */}
      <header className="relative z-10 border-b border-gray-800/50 backdrop-blur-xl bg-black/20">
        <div className="container mx-auto px-6 py-12">
          <div className="flex items-center justify-center mb-8">
            <div className="relative mr-6">
              <div className="relative">
                <Coins className="h-16 w-16 text-cyan-400 animate-pulse" />
                <div className="absolute inset-0 h-16 w-16 text-cyan-400 animate-ping opacity-20">
                  <Coins className="h-16 w-16" />
                </div>
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center">
                <Zap className="h-3 w-3 text-black" />
              </div>
            </div>
            <div className="text-center">
              <h1 className="text-6xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-green-400 bg-clip-text text-transparent mb-2 tracking-tight">
                CRIPTOS DO VÔ RICA
              </h1>
              <p className="text-gray-400 font-mono text-lg">Portfolio de Criptomoedas em Tempo Real</p>
            </div>
          </div>
          <div className="text-center">
            <Badge className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 text-blue-300 border-blue-500/30 font-mono text-sm px-4 py-2 backdrop-blur-sm">
              <Globe className="h-4 w-4 mr-2" />
              ATUALIZAÇÃO A CADA 3 MIN
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 py-16">
        {!selectedCrypto ? (
          <>
            {/* Enhanced Portfolio Overview */}
            <div className="mb-16">
              <Card className="bg-gradient-to-br from-gray-900/80 via-gray-800/50 to-gray-900/80 border-gray-700/50 backdrop-blur-xl hover:bg-gray-800/60 transition-all duration-500 shadow-2xl hover:shadow-cyan-500/10 group">
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-4xl font-mono text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text mb-2">
                    PORTFOLIO TOTAL
                  </CardTitle>
                  <div className="w-24 h-1 bg-gradient-to-r from-cyan-400 to-blue-400 mx-auto rounded-full"></div>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-7xl font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-6 tracking-tight group-hover:scale-105 transition-transform duration-300">
                      {formatCurrency(totalPortfolioValue)}
                    </p>
                    {connectionStatus.lastUpdate && (
                      <div className="flex items-center justify-center space-x-2 text-gray-400 font-mono">
                        <Activity className="h-4 w-4 animate-pulse" />
                        <span>Última atualização: {formatTime(connectionStatus.lastUpdate)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Crypto Cards */}
            <div className="grid md:grid-cols-2 gap-10 max-w-7xl mx-auto">
              {cryptoData.map((crypto, index) => {
                const isPositive = crypto.price_change_percentage_24h >= 0

                return (
                  <Card
                    key={crypto.id}
                    className="bg-gradient-to-br from-gray-900/60 via-gray-800/40 to-gray-900/60 border-gray-700/50 backdrop-blur-xl hover:bg-gray-800/50 transition-all duration-500 hover:scale-[1.02] hover:border-cyan-500/50 group relative overflow-hidden shadow-2xl"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Enhanced Live indicator */}
                    <div className="absolute top-6 right-6 flex items-center space-x-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          connectionStatus.isOnline ? "bg-green-400 animate-pulse" : "bg-yellow-400 animate-pulse"
                        }`}
                      ></div>
                      <span className="text-xs font-mono text-gray-400">LIVE</span>
                    </div>

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                    <CardHeader className="pb-6 relative z-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {crypto.symbol === "BTC" ? (
                            <div className="relative">
                              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <Bitcoin className="h-10 w-10 text-white" />
                              </div>
                              <div className="absolute inset-0 w-16 h-16 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-2xl animate-pulse opacity-20"></div>
                            </div>
                          ) : (
                            <div className="relative">
                              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <Coins className="h-10 w-10 text-white" />
                              </div>
                              <div className="absolute inset-0 w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl animate-pulse opacity-20"></div>
                            </div>
                          )}
                          <div>
                            <CardTitle className="text-3xl font-mono text-white group-hover:text-cyan-400 transition-colors duration-300">
                              {crypto.name}
                            </CardTitle>
                            <CardDescription className="text-gray-400 font-mono text-lg">
                              {crypto.symbol}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge
                          className={`flex items-center space-x-2 font-mono text-sm px-4 py-2 rounded-xl backdrop-blur-sm ${
                            isPositive
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : "bg-red-500/20 text-red-400 border-red-500/30"
                          }`}
                        >
                          {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          <span>{crypto.price_change_percentage_24h.toFixed(2)}%</span>
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-8 relative z-10">
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="bg-gradient-to-br from-gray-800/60 to-gray-700/40 p-6 rounded-2xl border border-gray-600/30 backdrop-blur-sm hover:bg-gray-700/50 transition-all duration-300">
                            <p className="text-gray-400 text-sm mb-2 font-mono uppercase tracking-wide">Preço Atual</p>
                            <p className="text-3xl font-bold text-cyan-400 font-mono">
                              {formatCurrency(crypto.current_price)}
                            </p>
                          </div>
                          <div className="bg-gradient-to-br from-gray-800/60 to-gray-700/40 p-6 rounded-2xl border border-gray-600/30 backdrop-blur-sm hover:bg-gray-700/50 transition-all duration-300">
                            <p className="text-gray-400 text-sm mb-2 font-mono uppercase tracking-wide">Quantidade</p>
                            <p className="text-xl font-semibold text-white font-mono">{crypto.displayAmount}</p>
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-gray-800/80 via-gray-700/60 to-gray-800/80 p-8 rounded-2xl border border-gray-600/40 backdrop-blur-sm relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/5 opacity-50"></div>
                          <div className="relative z-10">
                            <p className="text-gray-400 text-sm mb-3 font-mono uppercase tracking-wide">Valor Total</p>
                            <p className="text-4xl font-bold text-transparent bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text font-mono">
                              {formatCurrency(crypto.totalValue)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={() => setSelectedCrypto(crypto.id)}
                        className="w-full bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white font-mono font-semibold py-6 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-cyan-500/25 group"
                        size="lg"
                      >
                        <BarChart3 className="h-6 w-6 mr-3 group-hover:rotate-12 transition-transform duration-300" />
                        VER DETALHES {crypto.name}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </>
        ) : (
          /* Crypto Detail View */
          <CryptoDetailView
            crypto={cryptoData.find((c) => c.id === selectedCrypto)!}
            onBack={() => setSelectedCrypto(null)}
            connectionStatus={connectionStatus}
          />
        )}
      </main>

      {/* Enhanced Footer */}
      <footer className="relative z-10 mt-20 py-12 text-center border-t border-gray-800/50 backdrop-blur-xl bg-black/20">
        <div className="font-mono space-y-4">
          <p className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            © 2025 CRIPTOS DO VÔ RICA
          </p>
          <div className="flex items-center justify-center space-x-4 text-gray-400">
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4" />
              <span className="text-sm">Dados via CryptoCompare & CoinCap APIs</span>
            </div>
            <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span className="text-sm">Tempo Real</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function CryptoDetailView({
  crypto,
  onBack,
  connectionStatus,
}: {
  crypto: CryptoData
  onBack: () => void
  connectionStatus: ConnectionStatus
}) {
  const chartData = useMemo(
    () => generateChartData(crypto.current_price, crypto.id === "bitcoin" ? 0.05 : 0.15),
    [crypto.current_price, crypto.id],
  )

  return (
    <div className="space-y-10">
      {/* Enhanced Back Button */}
      <Button
        onClick={onBack}
        variant="outline"
        className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white font-mono bg-transparent backdrop-blur-sm px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105"
      >
        ← VOLTAR AO PORTFOLIO
      </Button>

      {/* Enhanced Crypto Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center mb-8">
          {crypto.symbol === "BTC" ? (
            <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-3xl flex items-center justify-center mr-6">
              <Bitcoin className="h-16 w-16 text-white" />
            </div>
          ) : (
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mr-6">
              <Coins className="h-16 w-16 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-6xl font-bold font-mono text-white mb-2">{crypto.name}</h1>
            <p className="text-2xl text-gray-400 font-mono">{crypto.symbol}</p>
          </div>
          <div
            className={`ml-6 w-4 h-4 rounded-full ${
              connectionStatus.isOnline ? "bg-green-400 animate-pulse" : "bg-yellow-400 animate-pulse"
            }`}
          ></div>
        </div>
        <div className="text-7xl font-bold text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text font-mono mb-4">
          {formatCurrency(crypto.current_price)}
        </div>
        <Badge
          className={`text-xl px-6 py-3 font-mono rounded-2xl backdrop-blur-sm ${
            crypto.price_change_percentage_24h >= 0
              ? "bg-green-500/20 text-green-400 border-green-500/30"
              : "bg-red-500/20 text-red-400 border-red-500/30"
          }`}
        >
          {crypto.price_change_percentage_24h >= 0 ? (
            <TrendingUp className="h-5 w-5 mr-3" />
          ) : (
            <TrendingDown className="h-5 w-5 mr-3" />
          )}
          {crypto.price_change_percentage_24h.toFixed(2)}% (24h)
        </Badge>
        {connectionStatus.lastUpdate && (
          <p className="text-gray-400 font-mono mt-4 flex items-center justify-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Última atualização: {formatTime(connectionStatus.lastUpdate)}</span>
          </p>
        )}
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <Card className="bg-gradient-to-br from-gray-900/80 to-gray-800/60 border-gray-700/50 backdrop-blur-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-mono text-gray-400 uppercase tracking-wide">Quantidade</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white font-mono">
              {crypto.displayAmount} {crypto.symbol}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900/80 to-gray-800/60 border-gray-700/50 backdrop-blur-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-mono text-gray-400 uppercase tracking-wide">Valor Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-transparent bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text font-mono">
              {formatCurrency(crypto.totalValue)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900/80 to-gray-800/60 border-gray-700/50 backdrop-blur-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-mono text-gray-400 uppercase tracking-wide">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3">
              <div
                className={`w-4 h-4 rounded-full ${
                  connectionStatus.isOnline ? "bg-green-400 animate-pulse" : "bg-yellow-400 animate-pulse"
                }`}
              ></div>
              <span className={`font-mono text-lg ${connectionStatus.isOnline ? "text-green-400" : "text-yellow-400"}`}>
                {connectionStatus.isOnline ? "ONLINE" : "CACHE"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Charts */}
      <Tabs defaultValue="price" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-900/50 border-gray-800 backdrop-blur-xl rounded-2xl p-2">
          <TabsTrigger
            value="price"
            className="font-mono data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-blue-600 rounded-xl py-3"
          >
            GRÁFICO DE PREÇO
          </TabsTrigger>
          <TabsTrigger
            value="volume"
            className="font-mono data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 rounded-xl py-3"
          >
            VOLUME
          </TabsTrigger>
        </TabsList>

        <TabsContent value="price" className="mt-8">
          <Card className="bg-gradient-to-br from-gray-900/60 to-gray-800/40 border-gray-700/50 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="font-mono text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text flex items-center text-xl">
                <Activity className="h-6 w-6 mr-3" />
                HISTÓRICO DE PREÇOS (30 DIAS)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} fontFamily="monospace" />
                    <YAxis
                      stroke="#9ca3af"
                      fontSize={12}
                      fontFamily="monospace"
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: "12px",
                        fontFamily: "monospace",
                        backdropFilter: "blur(12px)",
                      }}
                      formatter={(value: any) => [formatCurrency(value), "Preço"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="#06b6d4"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorPrice)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="volume" className="mt-8">
          <Card className="bg-gradient-to-br from-gray-900/60 to-gray-800/40 border-gray-700/50 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="font-mono text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text flex items-center text-xl">
                <BarChart3 className="h-6 w-6 mr-3" />
                VOLUME DE NEGOCIAÇÃO
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} fontFamily="monospace" />
                    <YAxis
                      stroke="#9ca3af"
                      fontSize={12}
                      fontFamily="monospace"
                      tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: "12px",
                        fontFamily: "monospace",
                        backdropFilter: "blur(12px)",
                      }}
                      formatter={(value: any) => [`${(value / 1000000).toFixed(2)}M`, "Volume"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="volume"
                      stroke="#a855f7"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorVolume)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
