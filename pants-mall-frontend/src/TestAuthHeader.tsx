import { useState } from "react"
import client from "./api/client"

export default function TestAuthHeader() {
  const [result, setResult] = useState("")

  async function testFavorites() {
    try {
      const resp = await client.get("/favorites") // client baseURL=/api
      setResult(JSON.stringify(resp.data, null, 2))
    } catch (e: unknown) {
      setResult((e as Error)?.message || "请求失败")
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>测试鉴权接口</h2>
      <button onClick={testFavorites}>GET /favorites</button>
      <pre style={{ marginTop: 12 }}>{result}</pre>
    </div>
  )
}