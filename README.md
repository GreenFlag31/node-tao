## Node Template Engine

**`TAO`** is a simple, lightweight and very fast embedded JS templating. It emphasizes great performance, security, and developer experience.

### 🌟 Features

- 🚀 Super Fast
- 🔧 Configurable
- 🔥 Caching
- ⚡️ Support for partials
- 📝 Easy template syntax (no prefix needed)
- 💻 Developer experience
- 🧩 Support for local and global helpers
- 🛡️ Security by design

## Get Started

Define a template `simple.html` inside a view directory `templates`

```html
<!-- templates/simple.html -->
<h1>Hi <%= name %>!</h1>
```

```javascript
import { Eta } from 'eta';

const eta = new Eta({ views: path.join(__dirname, 'templates') });

const res = eta.render('./simple', { name: 'Tao' });
console.log(res); // <h1>Hi Tao!</h1>
```

## Helpers

Helpers are functions that can be used inside a template. Helpers can be local (only available in a particular `render`) or global (available everywhere on the instance).

```javascript
import { Eta } from 'eta';

const eta = new Eta({ views: path.join(__dirname, 'templates') });

// Global helper
function nPlusTwo(n: number) {
  return n + 2;
}
// Global helper need to be registered on the instance
eta.defineHelpers({ nPlusTwo });

// Render a template
app.get('/', (req, res) => {
  // Local helper
  function nPlusOne(n: number) {
    return n + 1;
  }
  const data = { name: 'Ben' };

  const res = eta.render('simple', { name: 'Ben' }, { nPlusOne });
  console.log(res); // <h1>Hi Ben!</h1>
});
```

It is also possible to register an helper on `globalThis`, but it can lead to name collision.

## Template paths resolution

`TAO` will _recursively_ add all templates matching the containing `views` path definition:

```javascript
import { Eta } from 'eta';

const eta = new Eta({ views: path.join(__dirname, 'templates') });
```

such that following structure is ok:

```
| /templates
|   - simple.html         ✔️
|   /products
|     - article.html      ✔️
|     /...
|       - nested.html     ✔️
```

By default, `fileResolution` is set to `flexible`, which means that you can only provide _end unique paths_:

```javascript
const res = eta.render('article');
```

`TAO` will successfully identify the nested templates without providing the subfolder(s).

## FAQs

<details>
  <summary>
    <b>Some words about this library</b>
  </summary>

It started as a fork of `eta`, but became a complete rewrite of the library because the changes made were too significant. Some parts are still based on `eta`, especially the template parsing, and if you know `eta`, the api will be familiar.

</details>

<details>
  <summary>
    <b>If you want to compare `tao` with `eta`</b>
  </summary>

- Tao set security by design: Stack traces are not (and _should not_) be visible in the browser.
- Increased developer experience: Visual error representation, metrics, configuration options are checked. Zero frustration!
- Immutability: Data provided in the template is immutable, ie. template data modification does not affect original data.
- Clearer API: Scope is well defined and restricted, which also improves security.
- Clearer template syntax: No prefix are needed.
- Helpers: Global and local helpers are helpfull for many usecases, such as translation, little template logic, etc.
- Flexible template path resolution: With `fileResolution` mode set to `flexible`, only end unique paths can be provided, which increases file path readability (feature equivalent to `namespaces`).

</details>

<details>
  <summary>
    <b>Choices</b>
  </summary>

- No async support: Supporting async rendering (ie. `await include`) in the template would be an incentive to put a lot of logic in the template. A template should display the data, a controller should handle the logic. Async logic in the template would also necessitate error management (ie. `try catch`), which would increase the logic in the template. Having too much logic in the template is untestable, undebuggable, and hard to read. In other words: if you have async data, fetch it first then display it synchronously in your template!
- No `layouts`: Layouts are technically includes and add unnecessary complexifications.
- No `rmWhitespace`: Removing whitespaces by the template engine offers negligible economy of the HTML size. An HTML compression by a proxy (Nginx or others) would be much more efficient.

_If you think those features are absolutely necessary, please open a new discussion on github and provide an example._

</details>

<br />

## Security by design

By default, `TAO` assume you are running your app in production, so no error will be thrown, such that error stack traces are not visible in your browser. Errors will be displayed in your editor console, and visual error representation (see developer experience) is available in your browser by setting `debug: true` at option initialisation. If you run your application in production (checking environnement variable `NODE_ENV`), no error will be thrown.

## Developer experience

All methods, properties are correctly typed and documented, so you should get help from your editor.

In case of an error, a visual representation is available in your browser, giving you all the details and the precise line of the error (if available).

![Error representation](error-representation.png)

NB: _set `debug: true` to activate this option. Debug is not available in production._

Metrics are also available, so you get some usefull informations about the template rendering time, cache hit, mapped templates, etc. in your browser console.

![Metrics](metrics.png)

NB: _Metrics is not available in production._

## Credits

- Syntax and some parts of compilation are based on `eta`.
