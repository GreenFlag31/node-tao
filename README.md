## Node Template Engine

TAO is a simple, lightweight and very fast embedded JS templating. It's written in TypeScript and emphasizes great performance, security, and developer experience.

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

Define a template `simple.tao` inside a view directory `templates`

```html
<!-- templates/simple.tao -->
<h1>Hi <%= name %>!</h1>
```

```javascript
import { Eta } from 'eta';

const eta = new Eta({ views: path.join(__dirname, 'templates') });

const res = eta.render('./simple', { name: 'Ben' });
console.log(res); // <h1>Hi Ben!</h1>
```

## Complete example

```javascript
import { Eta } from 'eta';

const eta = new Eta({ views: path.join(__dirname, 'templates') });

// Global helpers, available everywhere on the instance
function nPlusTwo(n: number) {
  return n + 2;
}
eta.defineHelpers({ nPlusTwo });

// Local helper
function nPlusOne(n: number) {
  return n + 1;
}

// Render a template
app.get('/', (req, res) => {
  // data are immutables by default
  const data = { name: 'Ben' };
  const res = eta.render('./simple', { name: 'Ben' }, { nPlusOne });
  console.log(res); // <h1>Hi Ben!</h1>
});
```

## FAQs

<details>
  <summary>
    <b>Some words about this library</b>
  </summary>

It started as a fork of `eta`, but eventually became a complete rewrite of the library because the changes made were too significant. Some parts are still based on `eta`, especially the template parsing, and if you know `eta`, the api will be familiar.

</details>

<details>
  <summary>
    <b>Choices</b>
  </summary>

- No async support: Supporting async rendering (ie. `await include`) in the template would be an incentive to put a lot of logic in the template. A template should display the data, a controller should handle the logic. Async logic in the template would also necessitate error management (ie. `try catch`), which would increase the logic in the template. Having too much logic in the template is untestable, undebuggable, and hard to read.
- No `layouts`: Layouts are technically includes and add unnecessary complexities.

</details>

<br />

## Security by design

By default, `TAO` assume you are running your app in production, so no error will be thrown, such that error stack traces are not visible in your browser. Errors will be displayed in your editor console, and visual error representation (see developer experience) is available in your browser by setting `debug: true` at option initialisation. If you run your application in production (checking environnement variable `NODE_ENV`), no error will be thrown.

## Developer experience

All methods, properties are correctly typed and documented, so you should get help from your editor.

In case of an error, a visual representation is available in your browser, giving you all the details and the precise line of the error (if available).

<!-- PIC -->

NB: _set `debug: true` to activate this option. Debug is not available in production._

Metrics are also available, so you get some usefull informations about the template rendering time, cache hit, mapped templates, etc. in your browser console.

<!-- PIC -->

NB: _Metrics is not available in production._

## Credits

- Syntax and some parts of compilation are based on ETA.
