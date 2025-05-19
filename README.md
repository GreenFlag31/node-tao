## Node Template Engine

TAO is a lightweight and very fast embedded JS templating. It's written in TypeScript and emphasizes great performance, security, and developer experience.

### 🌟 Features

- 🚀 Super Fast
- 🔧 Configurable
- 🔥 Caching
- ⚡️ Support for partials
- 📝 Easy template syntax
- 💻 Developer experience
- 🧩 Support for local and global helpers
- 🛡️ Security-focused by design

## Get Started

Define a template `templates/simple.eta`

```eta
<h1>Hi <%= name %>!</h1>
```

```js
import { Eta } from 'eta';

const eta = new Eta({ views: path.join(__dirname, 'templates') });

// Render a template
const res = eta.render('./simple', { name: 'Ben' });
console.log(res); // Hi Ben!
```

## FAQs

<details>
  <summary>
    <b>Where did Eta's name come from?</b>
  </summary>

"Eta" means tiny in Esperanto. Plus, it can be used as an acronym for all sorts of cool phrases: "ECMAScript Template Awesomeness", "Embedded Templating Alternative", etc....

Additionally, Eta is a letter of the Greek alphabet (it stands for all sorts of cool things in various mathematical fields, including efficiency) and is three letters long (perfect for a file extension).

</details>

<br />

## Security

By default, TAO assume you are running your app in production, so no error will be thrown, such that error stack trace are not visible in your browser. Errors will be displayed in your editor console, and visual error representation (see developer experience) is available by changing the configuration.

## Developer experience

In case of an error, a visual representation will be available in your browser, giving you all the details and the precise line of the error.

<!-- PIC -->

Metrics are also available, so you get some usefull informations about the rendering time, cache hit, etc. of your template in your browser console.

<!-- PIC -->

## Credits

- Async support, file handling, and error formatting were based on code from [EJS](https://github.com/mde/ejs), which is licensed under the Apache-2.0 license. Code was modified and refactored to some extent.
- Syntax and some parts of compilation are heavily based off EJS, Nunjucks, and doT.
