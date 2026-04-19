import { useState } from "react"
import client from "./api/client"

export default function TestOptions() {
  const [spuId, setSpuId] = useState("1")
  const [result, setResult] = useState("")

  async function load() {
    const resp = await client.get("/pants/options", { params: { spuId } })
    setResult(JSON.stringify(resp.data, null, 2))
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>测试 /pants/options</h2>
      <input value={spuId} onChange={(e) => setSpuId(e.target.value)} />
      <button onClick={load} style={{ marginLeft: 8 }}>加载</button>
      <pre style={{ marginTop: 12 }}>{result}</pre>
    </div>
  )
}