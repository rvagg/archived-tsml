const http = require('http')
    , servertest = require('./')
    , test = require('tape')
    , through2 = require('through2')
    , fs = require('fs')
    , bl = require('bl')

// uppercasing server
var server = http.createServer(function (req, res) {
  req.pipe(through2(function (chunk, enc, callback) {
    callback(null, chunk.toString().toUpperCase())
  })).pipe(res)
})

test('simple web server server', function (t) {
  var serverStream = servertest(server, '/', { method: 'POST' })

  fs.createReadStream(__filename).pipe(serverStream)

  serverStream.pipe(bl(function (err, data) {
    t.ifError(err, 'no error')

    var expected = fs.readFileSync(__filename, 'utf8').toUpperCase()
    t.equal(data.toString(), expected, 'uppercased data')
    t.end()
  }))
})
