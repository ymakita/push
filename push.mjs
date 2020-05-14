import express from 'express'
import fs from 'fs'
import multer from 'multer'
import util from './util.mjs'
import dotenv from 'dotenv'
dotenv.config()

const SECPATH = process.env.SECPATH || '/uploaded/'
const PORT = process.env.PORT || 8006

const app = express()

const getIP = function (req) {
  if (req.headers['x-forwarded-for']) {
    return req.headers['x-forwarded-for']
  }
  if (req.connection && req.connection.remoteAddress) {
    return req.connection.remoteAddress
  }
  if (req.connection.socket && req.connection.socket.remoteAddress) {
    return req.connection.socket.remoteAddress
  }
  if (req.socket && req.socket.remoteAddress) {
    return req.socket.remoteAddress
  }
  return '0.0.0.0'
}
const encodeIP = function (ip) {
  return ip.replace(/\.|:/g, '_')
}

const fnid = 'data/id.txt'
const getID = function () {
  let id = 0
  try {
    id = parseInt(fs.readFileSync(fnid, 'utf-8'))
  } catch (e) {
  }
  id++
  fs.writeFileSync(fnid, id, 'utf-8')
  return id
}
const getPassCode = function (id) {
  const fix0 = function (n, m) {
    const s = '00000000000' + n
    return s.substring(s.length - m)
  }
  const len = 6
  const n = []
  for (let i = 0; i < len; i++) {
    n.push(fix0(util.rnd(10000), 4))
  }
  id = parseInt(id)
  for (;;) {
    n.push(fix0(id % 10000, 4))
    id = Math.floor(id / 10000)
    if (!id) { break }
  }
  return n.join('-')
}
const decodeID = function (pass) {
  let id = 0
  const n = pass.split('-')
  let m = 1
  for (let i = 6; i < n.length; i++) {
    id = parseInt(n[i]) * m
    m *= 10000
  }
  return id
}

const getList = function () {
  const list = fs.readdirSync('data')
  const res = []
  for (const f of list) {
    if (!f.endsWith('.json')) { continue }
    const d = JSON.parse(fs.readFileSync('data/' + f, 'utf-8'))
    const id = f.substring(0, f.length - 5)
    res.push({ id: id, name: d.施設名 })
  }
  return res
}

app.get('/*', (req, res) => {
  let url = req.url
  // console.log(req.query.data)
  if (req.query.id) {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Content-Type', 'application/json; charset=utf-8')
    const id = parseInt(req.query.id)
    try {
      if (id > 0) {
        const d = fs.readFileSync('data/' + id + '.json', 'utf-8')
        res.send(d)
      } else {
        const list = getList()
        res.send(JSON.stringify(list))
      }
      return
    } catch (e) {
    }
    res.send(JSON.stringify({ err: 'not found' }))
    return
  }
  const d = req.query.data
  if (d) {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Content-Type', 'application/json; charset=utf-8')

    const data = JSON.parse(d)
    data.lastUpdate = util.formatYMDHMS()
    const pass = data.パスコード
    delete data.パスコード
    // console.log(data, pass)
    if (pass) {
      const id = decodeID(pass)
      try {
        const chk = fs.readFileSync('data/' + id + '-pass.txt', 'utf-8')
        console.log(chk)
        if (chk === pass) {
          fs.writeFileSync('data/' + id + '.json', JSON.stringify(data))
          res.send(JSON.stringify({ res: 'ok', id: id, lastUpdate: data.lastUpdate }))
          return
        }
      } catch (e) {
        console.log(e)
      }
    }

    // console.log(req)
    // console.log(req.body)
    console.log(req.url)
    const id = getID()
    const newpass = getPassCode(id)
    console.log(id, newpass)
    fs.writeFileSync('data/' + id + '-pass.txt', newpass)
    fs.writeFileSync('data/' + id + '.json', JSON.stringify(data))

    res.send(JSON.stringify({ res: 'ok', id: id, pass: newpass, lastUpdate: data.lastUpdate }))
    return
  }
  if (url === '/' || url.indexOf('..') >= 0) {
    url = '/index.html'
  }
  let ctype = 'text/plain'
  if (url.endsWith('.html')) {
    ctype = 'text/html; charset=utf-8'
  } else if (url.endsWith('.js')) {
    ctype = 'application/javascript'
  } else if (url.endsWith('.mjs')) {
    ctype = 'application/javascript'
  } else if (url.endsWith('.css')) {
    ctype = 'text/css'
  }
  let data = null
  try {
    data = fs.readFileSync('static' + url)
  } catch (e) {
  }
  res.header('Content-Type', ctype)
  res.send(data)
})

app.listen(PORT, () => {
  console.log('to access the top')
  console.log(`http://localhost:${PORT}/`)
  console.log()
  console.log('edit .env if you want to change')
  console.log()
  console.log('https://github.com/code4fukui/push/')
})