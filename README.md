# servertest

**A simple HTTP server testing tool**

[![NPM](https://nodei.co/npm/servertest.png?downloads=true&downloadRank=true)](https://nodei.co/npm/servertest/)
[![NPM](https://nodei.co/npm-dl/servertest.png?months=6&height=3)](https://nodei.co/npm/servertest/)

## Why?

**servertest** exists because [supertest](https://github.com/visionmedia/supertest) does way too much and gets in the way when you need to do anything novel (the typical "framework" problem).

**servertest** doesn't do any assertions for you, you simply hand it an HTTP server and it manages the start / stop lifecycle and makes a request for you, passing you back the results. **servertest** is built on **[hyperquest](https://github.com/substack/hyperquest)** as an HTTP client and supports the same options as hyperquest and will stream if you need to (in and/or out).

## Examples

```js
var server = http.createServer(function (req, res) {
  res.end('OK')
})

test('simple web server', function (t) {
  servertest(server, '/', { encoding: 'utf8' }, function (err, res) {
    t.ifError(err, 'no error')
    t.equal(res.statusCode, 200, 'correct statusCode')
    t.equal(res.body, 'OK', 'correct body content')
    t.end()
  })
})
```

Even JSON encoding can be handled for you:

```js
var server = http.createServer(function (req, res) {
  res.end(JSON.stringify({ ok: 'mate' }))
})

test('json web server', function (t) {
  servertest(server, '/', { encoding: 'json' }, function (err, res) {
    t.ifError(err, 'no error')
    t.equal(res.statusCode, 200, 'correct statusCode')
    t.deepEqual(res.body, { ok: 'mate' }, 'correct body content')
    t.end()
  })
})
```

And of course it's streams all the way:

```js
// uppercasing server, post it a string and it'll return
// an uppercased version of it
var server = http.createServer(function (req, res) {
  req.pipe(through2(function (chunk, enc, callback) {
    callback(null, chunk.toString().toUpperCase())
  })).pipe(res)
})

test('duplex uppercasing server', function (t) {
  // servertest is a duplex stream when posting data
  var serverStream = servertest(server, '/', { method: 'POST' })

  // pipe data to the POST request
  fs.createReadStream(__filename).pipe(serverStream)

  // pipe data from the response
  serverStream.pipe(bl(function (err, data) {
    t.ifError(err, 'no error')

    var expected = fs.readFileSync(__filename, 'utf8').toUpperCase()
    t.equal(data.toString(), expected, 'uppercased data')
    t.end()
  }))
})
```

Of course this assumes that you have easy access to your `http.Server` object in your tests. Normally you will want to expose it on your server directly on your main server start script and not perform the `listen()` yourself if it's not being run as the "main":

**index.js**

```js
module.exports = function () {
  return http.createServer(handler)
}

if (require.main === module) {
  module.exports().listen(port, function (err) {
    console.log('Server started on port %d', port)
  })
}
```

Then you can do this:

**test.js**

```js
var server = require('./index')

test('test server', function (t) {
  servertest(server(), '/path/to/test', function (err, data) {
  	// ...
  })
})
```

Or you could reuse the same `server` object but that's probably not so savoury for testing.

## API

### servertest(server, uri, options, callback)

Full arguments form, taking an `http.Server` instance (or similar object that performs a `listen()`), the `uri` to append to `http://localhost` and the random port number assigned on the `listen()`, the `options` object which is mostly passed on to [hyperquest](https://github.com/substack/hyperquest). The `callback` function will receive either an `Error` as the first argument or a special `response` object that contains data about the response, see below

### servertest(server, uri, callback)

The `options` argument is optional, default options will be used for hyperquest, including assuming this is a GET request.

### var stream = servertest(server, uri, { method: 'POST' }, callback)

A common POST request form whereby you have a WritableStream you can write data to (either via a `pipe()` or simply `write()` and `end()`).

### var stream = servertest(server, uri, { method: 'POST' })

Don't use a `callback` function to receive the data. Instead, the `stream` is a DuplexStream which has some metadata on the `stream` object (including the `request` object direct from hyperquest) and you will need to `pipe()` it to a WritableStream (or `read()` or `on('data')`, whatever you prefer).

### options

- <b><code>'encoding'</code></b>: the only option **servertest** currently cares about. If you provide `'utf8'` the `callback` will receive a `String` rather than a `Buffer`. If you provide `'json'` the data received from the server will be passed through `JSON.parse()` and any exceptions will be returned as the `Error` argument to the `callback`.

**[hyperquest](https://github.com/substack/hyperquest)** uses the following options:

- <b><code>'method'</code></b>: request method, defaults to `'GET'`
- <b><code>'headers'</code></b>: an `Object` (`{}`) defining headers to set on the request
- <b><code>'auth'</code></b>: if HTTP authentication is required, must be of the form `'user:pass'`

Plus a bunch more for HTTPS.

### response

The `callback` receives a special `response` object containing data from the server. It will have the following properties:

- <b><code>'headers'</code></b>: an `Object` containing a mapping of the header keys and values received from the server
- <b><code>'statusCode'</code></b>: the status code of the response from the server
- <b><code>'body'</code></b>: the response body. By default it will be a `Buffer`. If you use `'utf8'` as the `'encoding'` you'll get a `String` and if you use `'json'` as the `'encoding'` you'll get whatever `JSON.parse()` gives you for the response string.

### error

when `servertest` has an encoding error like this [case](test.js#L276-L284), you can access a `response` with the default encoding `UTF-8` or `utf8` from `error.response`, this should give you, the users, much clue as to what your program went wrong.

## License

**servertest** is Copyright (c) 2014 Rod Vagg [@rvagg](https://twitter.com/rvagg) and licenced under the MIT licence. All rights not explicitly granted in the MIT license are reserved. See the included LICENSE.md file for more details.
