const test       = require('tape')
    , http       = require('http')
    , fs         = require('fs')
    , crypto     = require('crypto')
    , bl         = require('bl')
    , through2   = require('through2')
    , servertest = require('./')


test('simple text/plain root server', function (t) {
  var server = http.createServer(function (req, res) {
    t.equal(req.method, 'GET', 'correct method (GET)')
    t.equal(req.url, '/', 'correct url')
    res.end('OK')
  })

  servertest(server, '/', function (err, res) {
    t.ifError(err, 'no error')

    t.equal(res.statusCode, 200, 'statusCode')
    t.ok(Buffer.isBuffer(res.body), 'body is buffer')
    t.equal(res.body.toString(), 'OK', 'body content')
    t.end()
  })
})


test('simple text/plain root server encoding=utf8', function (t) {
  var server = http.createServer(function (req, res) {
    t.equal(req.method, 'GET', 'correct method (GET)')
    t.equal(req.url, '/', 'correct url')
    res.end('OK')
  })

  servertest(server, '/', { encoding: 'utf8' }, function (err, res) {
    t.ifError(err, 'no error')

    t.equal(res.statusCode, 200, 'statusCode')
    t.equal(typeof res.body, 'string', 'body is string')
    t.equal(res.body.toString(), 'OK', 'body content')
    t.end()
  })
})


test('simple text/plain root server encoding=json', function (t) {
  var testObj = {
      date : new Date().toISOString()
    , num  : 101
    , str  : 'a string'
    , obj  : { x: 1 }
  }

  var server = http.createServer(function (req, res) {
    t.equal(req.method, 'GET', 'correct method (GET)')
    t.equal(req.url, '/', 'correct url')
    t.equal(req.headers['accept'], 'application/json', 'accepts application/json')
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(testObj))
  })

  servertest(server, '/', { encoding: 'json' }, function (err, res) {
    t.ifError(err, 'no error')

    t.equal(res.statusCode, 200, 'statusCode')
    t.equal(typeof res.body, 'object', 'body is object')
    t.deepEqual(res.body, testObj, 'body content')
    t.equal(res.headers['content-type'], 'application/json', 'got application/json header')
    t.end()
  })
})


test('root server accepting POST', function (t) {
  var server = http.createServer(function (req, res) {
    t.equal(req.method, 'POST', 'correct method (POST)')
    t.equal(req.url, '/', 'correct url')
    req.pipe(bl(function (err, data) {
      t.equal('this is some text written to the server', data.toString(), 'got correct post data')
      res.end('OK')
    }))
  })

  var req = servertest(server, '/', { method: 'POST' }, function (err, res) {
    t.ifError(err, 'no error')

    t.equal(res.statusCode, 200, 'statusCode')
    t.ok(Buffer.isBuffer(res.body), 'body is buffer')
    t.equal(res.body.toString(), 'OK', 'body content')
    t.end()
  })

  req.write('this is some text ')
  req.write('written to the ')
  req.end('server')
})


test('root server receiving binary data', function (t) {
  var testData = [ crypto.randomBytes(32),  crypto.randomBytes(32),  crypto.randomBytes(32) ]

  var server = http.createServer(function (req, res) {
    t.equal(req.method, 'POST', 'correct method (POST)')
    t.equal(req.url, '/', 'correct url')
    req.pipe(bl(function (err, data) {
      t.equal(Buffer.concat(testData).toString('hex'), data.toString('hex'), 'got correct post data')
      res.end('OK')
    }))
  })

  var req = servertest(server, '/', { method: 'POST' }, function (err, res) {
    t.ifError(err, 'no error')

    t.equal(res.statusCode, 200, 'statusCode')
    t.ok(Buffer.isBuffer(res.body), 'body is buffer')
    t.equal(res.body.toString(), 'OK', 'body content')
    t.end()
  })

  testData.forEach(function (d) { req.write(d) })
  req.end()
})


test('root server sending binary data', function (t) {
  var testData = [ crypto.randomBytes(32),  crypto.randomBytes(32),  crypto.randomBytes(32) ]

  var server = http.createServer(function (req, res) {
    t.equal(req.method, 'GET', 'correct method (GET)')
    t.equal(req.url, '/', 'correct url')
    testData.forEach(function (d) { res.write(d) })
    res.end()
  })

  servertest(server, '/', { method: 'GET' }, function (err, res) {
    t.ifError(err, 'no error')

    t.equal(res.statusCode, 200, 'statusCode')
    t.ok(Buffer.isBuffer(res.body), 'body is buffer')
    t.equal(Buffer.concat(testData).toString('hex'), res.body.toString('hex'), 'got correct post data')
    t.end()
  })
})


test('funky url', function (t) {
  var server = http.createServer(function (req, res) {
    t.equal(req.method, 'GET', 'correct method (GET)')
    t.equal(req.url, '/path/to/some/resource?yes&yes=it&is', 'correct url')
    res.end('OK')
  })

  servertest(server, '/path/to/some/resource?yes&yes=it&is', function (err, res) {
    t.ifError(err, 'no error')

    t.equal(res.statusCode, 200, 'statusCode')
    t.ok(Buffer.isBuffer(res.body), 'body is buffer')
    t.equal(res.body.toString(), 'OK', 'body content')
    t.end()
  })
})


test('statusCode', function (t) {
  var server = http.createServer(function (req, res) {
    t.equal(req.method, 'GET', 'correct method (GET)')
    t.equal(req.url, '/notfound', 'correct url')
    res.statusCode = 404
    res.end('not found')
  })

  servertest(server, '/notfound', function (err, res) {
    t.ifError(err, 'no error')

    t.equal(res.statusCode, 404, 'statusCode')
    t.ok(Buffer.isBuffer(res.body), 'body is buffer')
    t.equal(res.body.toString(), 'not found', 'body content')
    t.end()
  })
})


// streams on both ends!
test('root server sending and receiving binary data via streams', function (t) {
  var testDataIn  = [ crypto.randomBytes(32),  crypto.randomBytes(32),  crypto.randomBytes(32) ]
    , testDataOut = [ crypto.randomBytes(32),  crypto.randomBytes(32),  crypto.randomBytes(32) ]

  var server = http.createServer(function (req, res) {
    t.equal(req.method, 'POST', 'correct method (POST)')
    t.equal(req.url, '/post', 'correct url')
    res.setHeader('content-type', 'text/woot')
    req.pipe(bl(function (err, data) {
      t.equal(Buffer.concat(testDataIn).toString('hex'), data.toString('hex'), 'got correct post data')
      testDataOut.forEach(function (d) { res.write(d) })
      res.end()
    }))
  })

  var st = servertest(server, '/post', { method: 'POST' })
    , ins = require('through2')()

  ins.pipe(st).pipe(bl(function (err, body) {
    t.ifError(err, 'no error')

    t.equal(st.response.statusCode, 200, 'statusCode')
    t.equal(st.response.headers['content-type'], 'text/woot', 'statusCode')
    t.ok(Buffer.isBuffer(body), 'body is buffer')
    t.equal(Buffer.concat(testDataOut).toString('hex'), body.toString('hex'), 'got correct post data')
    t.end()
  }))

  testDataIn.forEach(function (d) { ins.write(d) })
  ins.end()
})


// example from the README
test('uppercasing duplex server', function (t) {
  var server = http.createServer(function (req, res) {
    req.pipe(through2(function (chunk, enc, callback) {
      callback(null, chunk.toString().toUpperCase())
    })).pipe(res)
  })

  var serverStream = servertest(server, '/', { method: 'POST' })

  fs.createReadStream(__filename).pipe(serverStream)

  serverStream.pipe(bl(function (err, data) {
    t.ifError(err, 'no error')

    var expected = fs.readFileSync(__filename, 'utf8').toUpperCase()
    t.equal(data.toString(), expected, 'uppercased data')
    t.end()
  }))
})


test('simple auto-/-prefix', function (t) {
  var server = http.createServer(function (req, res) {
    t.equal(req.method, 'GET', 'correct method (GET)')
    t.equal(req.url, '/blerg', 'correct url')
    res.end('OK')
  })

  servertest(server, 'blerg', function (err, res) {
    t.ifError(err, 'no error')

    t.equal(res.statusCode, 200, 'statusCode')
    t.ok(Buffer.isBuffer(res.body), 'body is buffer')
    t.equal(res.body.toString(), 'OK', 'body content')
    t.end()
  })
})

test('does not leak event emitters', function(t) {
  var server = http.createServer(function (req, res) {
    res.end('OK')
  })
  servertest(server, '/', function (err, res) {
    var events = Object.keys(server._events)
    var before = {}
    events.forEach(function (event) {
      before[event] = server.listeners(event).length
    })
    servertest(server, '/', function (err, res) {
      events.forEach(function (event) {
        t.equal(server.listeners(event).length, before[event], 'does not leak ' + event)
      })
      t.end()
    })
  })
})

test('attach response to err.response and non-enumerable', function(t) {
  var server = http.createServer(function (req, res) {
    res.end('OK')
  })
  servertest(server, '/', {encoding: 'json'}, function (err, res) {
    t.deepEqual(Object.keys(err), [])
    t.equal(err.message, 'Unexpected token O')
    t.ok(err.response, 'OK')
    t.end()
  })
})
