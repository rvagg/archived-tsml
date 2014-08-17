const hyperquest = require('hyperquest')
    , bl         = require('bl')
    , through2   = require('through2')
    , duplexer   = require('reduplexer')


function servertest (server, uri, options, callback) {
  if (typeof options == 'function') {
    callback = options
    options  = {}
  }

  if (!options)
    options = {}

  if (typeof options.headers != 'object')
    options.headers = {}

  if (options.encoding == 'json' && !options.headers['accept'])
      options.headers['accept'] = 'application/json'

  var instream  = through2()
    , outstream = through2()
    , stream    = duplexer(instream, outstream)

  server.listen(0, function (err) {
    if (err)
      return callback(err)

    var port = this.address().port
      , url = 'http://localhost:' + port + uri
      , resp = {}
      , req

    function onResponse (res) {
      resp.headers = res.headers
      resp.statusCode = res.statusCode
      stream.response = res
      if (typeof callback == 'function')
        req.pipe(bl(onEnd))
      else
        req.pipe(outstream)
    }

    function onEnd (err, data) {
      if (err) {
        if (!callback)
          throw err
        callback(err)
        return callback = null
      }

      if (options.encoding == 'utf8')
        resp.body = data.toString('utf8')
      else if (options.encoding == 'json') {
        try {
          resp.body = JSON.parse(data.toString('utf8'))
        } catch (e) {
          if (!callback)
            throw e
          callback(e)
          return callback = null
        }
      } else
        resp.body = data.slice()

      callback && callback(null, resp)
      callback = null
    }

    req = stream.request = hyperquest(url, options)

    instream.pipe(req)
    req.on('response', onResponse)
    req.on('end', server.close.bind(server))
  }).on('error', function (err) {
    if (!callback)
      throw err

    callback(err)
    callback = null
  })

  return stream
}


module.exports = servertest