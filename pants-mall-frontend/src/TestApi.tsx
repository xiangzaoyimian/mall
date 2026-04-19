import axios from "axios"
import { useState } from "react"

export default function TestApi() {

  const [result,setResult] = useState("")

  async function testLogin(){

    try{

      const resp = await axios.post("/api/auth/login",{
        username:"admin",
        password:"123456"
      })

      setResult(JSON.stringify(resp.data,null,2))

    }catch(e:unknown){

      setResult((e as Error)?.message || '测试登录失败')

    }

  }

  return (
    <div style={{padding:20}}>

      <h2>测试后端接口</h2>

      <button onClick={testLogin}>
        测试登录
      </button>

      <pre style={{marginTop:20}}>
        {result}
      </pre>

    </div>
  )
}