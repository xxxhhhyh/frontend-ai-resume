
import { useState, useEffect,useRef } from 'react'
import { Card, Button, Input, Row, Col,message } from 'antd'
import { CopyOutlined } from '@ant-design/icons'
import './App.css'

const { TextArea } = Input


function App() {
  const [inputText, setInputText] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const resultBoxRef=useRef(null)


  //定义复制函数
  const handleCopyResult=async()=>{
    if(!result){
      message.warning('还没有结果可以复制')
      return
    }
    try{
      await navigator.clipboard.writeText(result)
      message.success('复制成功!')
    }catch(err){
      message.error('复制失败,请手动复制')
    }
  }

  // 页面第一次加载时，从 localStorage 读取历史记录
  useEffect(()=>{
    const saved=localStorage.getItem('resumeHistory')
    if(saved){
      try{
        setHistory(JSON.parse(saved))
      }catch(e){
        console.error('读取历史记录',e)
      }
    }
  },[])

 //result变化时,自动滚动到底部
  useEffect(()=>{
    if(resultBoxRef.current){
      resultBoxRef.current.scrollTop=resultBoxRef.current.scrollHeight
    }
  },[result])
  

  //删除单条记录
  const handleDeleteHistory=(id)=>{
    const newHistory=history.filter(item=>item.id!==id)
    setHistory(newHistory)
    localStorage.setItem('resumeHistory',JSON.stringify(newHistory))
  }

  // 清空历史记录
  const handleClearHistory = () => {
    if(confirm('确定清空所有历史记录吗?')){
        setHistory([])
        localStorage.removeItem('resumeHistory') 
      }
  }

  // 点击历史记录，回填到左右两栏
  const handleLoadHistory = (item) => {
      setInputText(item.original)
      setResult(item.result)
  }


  const handleOptimize = async () => {
    if (!inputText.trim()) {
      alert('请先输入简历内容')
      return
    }

    setLoading(true)
    setResult('')

    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText })
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let resultText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.trim() !== '')

        for (const line of lines) {
          const jsonStr = line.replace(/^data: /, '')
          if (jsonStr === '[DONE]') continue
          try {
            const parsed = JSON.parse(jsonStr)
            const content = parsed.choices[0]?.delta?.content || ''
            if (content) {
              resultText += content
              setResult(resultText)
            }
          } catch (e) {
            // 忽略解析失败的行
          }
        }
      }

      // 流式输出结束后，把本次结果存入历史记录
      const newRecord = {
        id: Date.now(),
        original: inputText,
        result: resultText,
        time: new Date().toLocaleString()
      }
      const newHistory = [newRecord, ...history].slice(0, 10) // 最多存10条
      setHistory(newHistory)
      localStorage.setItem('resumeHistory', JSON.stringify(newHistory))

    } catch (error) {
      console.error('请求出错:', error)
      setResult('调用出错：' + error.message)
    } finally {
      setLoading(false)
    }
  }
 


  return (
    <div className="app-container">
      <div className="app-header">
        <h1 className="app-title">AI简历优化器</h1>
        <p className="app-subtitle">粘贴简历，AI帮你优化表达</p >
      </div>

      <Row gutter={[24, 24]} align="stretch">
        {/* 左侧：输入区 */}
        <Col xs={24} lg={10}>
          <Card title="原始简历" style={{ height: '100%' }} 
          extra={
            <Button
                type='link'
                onClick={()=>setInputText('')}
                >清空</Button>
          }
          >
        
            <TextArea
              className="resume-input"
              rows={15}
              placeholder="请粘贴您的原始简历内容..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              showCount
              maxLength={2000}
            />
          
          </Card>
        </Col>

        {/* 中间：按钮 */}
        <Col xs={24} lg={4} className="center-btn-col">
          <Button
            type="primary"
            size="large"
            onClick={handleOptimize}
            loading={loading}
            style={{ width: '100%', maxWidth: '120px' }}
          >
            AI优化
          </Button>
        </Col>

        {/* 右侧：结果区 */}
        <Col xs={24} lg={10}>
          <Card
            title="AI优化结果"
            style={{ height: '100%' }}
            extra={
            <div>
              <Button type="link" icon={<CopyOutlined />} onClick={handleCopyResult}>
                复制
              </Button>
              <Button type='link' onClick={handleOptimize} loading={loading}>重新生成</Button>
              </div>
            }
          >
            <div className="result-box" ref={resultBoxRef}>
              {result || 'AI优化后的内容将显示在这里。'}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 历史记录区 */}
      <div className="history-panel">
        <div className="history-header">
          <h3>历史记录</h3>
          {history.length > 0 && (
            <Button size="small" danger onClick={handleClearHistory}>
              清空
            </Button>
          )}
        </div>

        {history.length === 0 ? (
          <p className="history-empty">暂无记录</p >
        ) : (
          <div className="history-list">
            {history.map((item) => (
              <div
                key={item.id}
                className="history-item"
                onClick={() => handleLoadHistory(item)}
              >
                <p className="history-time">{item.time}</p >
                <p className="history-preview">
                  <strong>原始：</strong>
                  {item.original.slice(0, 30)}
                  {item.original.length > 30 ? '...' : ''}
                </p >
                <p className="history-preview">
                  <strong>结果：</strong>
                  {item.result.slice(0, 30)}
                  {item.result.length > 30 ? '...' : ''}
                </p >
                <Button
                size='small'
                danger
                onClick={(e)=>{
                 e.stopPropagation()
                handleDeleteHistory(item.id)
                }}
                >
                删除
                </Button>
              </div>
            ))}
          </div>
        )}
       
      </div>
    </div>
  )
}

export default App
