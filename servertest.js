const hyperquest = require('hyperquest')
    , bl         = require('bl')
    , through2   = require('through2')
    , duplexer   = require('reduplexer')


function servertest (server, uri, options, callback) {
  if (typeof options == 'function') {
    callback = options
    options  = {}
  }

  if (uri[0] != '/')
    uri = '/' + uri;

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
      return onReturn(err)

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
      if (err)
        return onReturn(err)

      if (options.encoding == 'utf8')
        resp.body = data.toString('utf8')
      else if (options.encoding == 'json') {
        try {
          resp.body = JSON.parse(data.toString('utf8'))
        } catch (e) {
          resp.body = data.toString('utf8')
          Object.defineProperty(e, 'response', {
            enumerable: false,
            writable: false,
            configurable: false,
            value: resp
          })
          return onReturn(e)
        }
      } else
        resp.body = data.slice()

      callback && callback(null, resp)
      callback = null
    }

    req = stream.request = hyperquest(url, options)

    instream.pipe(req)
    req.on('response', onResponse)
    req.on('end', function() {
      server.close(function() {
        server.removeListener('error', onReturn)
      })
    })
  }).on('error', onReturn)

  function onReturn (err) {
    if (!callback || typeof callback != 'function')
      throw err
    callback(err)
    return callback = null
  }

  return stream
}


module.exports = servertest
