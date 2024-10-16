# Livereload Server with Node JS

A minimal depenency server with livereload-js support.

background details relevant to understanding what this module does

When writing vanilla html/css/js, it's helpful to preview changes on save without having to reload the browser(s).

- local server for hosting the files
- websocket server for livereload-js communication
- minimal dependencies, ws for sockets is the most important

While the server is running, file changes will be emitted over
sockets to connected clients (browsers). Livereload-js will trigger a page reload for html/js, and update css files without reload.

## Usage

```js
node server.js
```

outputs

```
Server running at http://localhost:3000/
```

## Install

With [npm](https://npmjs.org/) installed, run

```
$ npm install basic-server
```

## Acknowledgments

- [Node JS](https://nodejs.org)
- [LiveReload](https://npmjs.com/package/livereload-js)
- [ws](https://npmjs.com/package/ws)
- [Mime-Types](https://npmjs.com/package/mime-types)

## License

[ISC](LICENSE)

Read more about the license at [opensource.org](https://opensource.org/licenses/ISC).
