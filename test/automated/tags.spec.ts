import { Tao } from '../../src/index';
import path from 'path';

const templateViews = path.join(__dirname, 'templates');
const tao = new Tao({ views: templateViews });

// ---------------------------------------------------------------------------
// Balise interpolate  <%= %>
// Échappe les caractères HTML spéciaux avant d'insérer la valeur.
// ---------------------------------------------------------------------------
describe('balise interpolate (<%= %>)', () => {
  it('affiche une valeur scalaire simple', () => {
    const result = tao.render('interpolate-basic', { message: 'Bonjour le monde' });
    expect(result).toContain('Bonjour le monde');
  });

  it('échappe les balises HTML (<, >)', () => {
    const result = tao.render('interpolate-escape', { unsafe: '<script>alert(1)</script>' });
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('échappe le caractère &', () => {
    const result = tao.render('interpolate-escape', { unsafe: 'Ben & Jerry' });
    expect(result).toContain('Ben &amp; Jerry');
  });

  it('échappe les guillemets doubles "', () => {
    const result = tao.render('interpolate-escape', { unsafe: 'say "hello"' });
    expect(result).toContain('say &quot;hello&quot;');
  });

  it('échappe les apostrophes', () => {
    const result = tao.render('interpolate-escape', { unsafe: "it's fine" });
    expect(result).toContain('it&#39;s fine');
  });

  it('évalue une expression arithmétique', () => {
    const result = tao.render('interpolate-expression', {
      a: 3,
      b: 7,
      label: 'hello',
      active: true,
      items: ['x', 'y'],
    });
    expect(result).toContain('10');
  });

  it('évalue une méthode de chaîne (toUpperCase)', () => {
    const result = tao.render('interpolate-expression', {
      a: 0,
      b: 0,
      label: 'world',
      active: false,
      items: [],
    });
    expect(result).toContain('WORLD');
  });

  it('évalue un opérateur ternaire', () => {
    const resultTrue = tao.render('interpolate-expression', {
      a: 0,
      b: 0,
      label: 'x',
      active: true,
      items: [],
    });
    const resultFalse = tao.render('interpolate-expression', {
      a: 0,
      b: 0,
      label: 'x',
      active: false,
      items: [],
    });
    expect(resultTrue).toContain('yes');
    expect(resultFalse).toContain('no');
  });

  it('évalue Array.join dans une expression', () => {
    const result = tao.render('interpolate-expression', {
      a: 0,
      b: 0,
      label: 'x',
      active: false,
      items: ['alpha', 'beta', 'gamma'],
    });
    expect(result).toContain('alpha, beta, gamma');
  });

  it('accède à une propriété imbriquée (un niveau)', () => {
    const result = tao.render('interpolate-nested', {
      user: { name: 'Alice', address: { city: 'Paris' } },
    });
    expect(result).toContain('Alice');
  });

  it('accède à une propriété imbriquée (deux niveaux)', () => {
    const result = tao.render('interpolate-nested', {
      user: { name: 'Bob', address: { city: 'Lyon' } },
    });
    expect(result).toContain('Lyon');
  });

  it('affiche plusieurs variables sur la même page', () => {
    const result = tao.render('interpolate-multiple', {
      first: 'un',
      second: 'deux',
      third: 'trois',
    });
    expect(result).toContain('un');
    expect(result).toContain('deux');
    expect(result).toContain('trois');
  });
});

// ---------------------------------------------------------------------------
// Balise raw  <%~ %>
// Insère la valeur telle quelle, sans échappement HTML.
// ---------------------------------------------------------------------------
describe('balise raw (<%~ %>)', () => {
  it("insère du HTML sans l'échapper", () => {
    const result = tao.render('raw-basic', { html: '<strong>bold</strong>' });
    expect(result).toContain('<strong>bold</strong>');
    expect(result).not.toContain('&lt;strong&gt;');
  });

  it('affiche du texte brut sans modification', () => {
    const result = tao.render('raw-basic', { html: 'simple text' });
    expect(result).toContain('simple text');
  });

  it("n'échappe pas les entités HTML passées en raw", () => {
    const result = tao.render('raw-basic', { html: '<em>&amp;</em>' });
    expect(result).toContain('<em>&amp;</em>');
  });

  it('contraste raw vs interpolate : raw conserve le HTML', () => {
    const snippet = '<b>gras</b>';
    const result = tao.render('raw-vs-interpolate', { html: snippet });
    // raw : balises conservées
    expect(result).toContain('<p id="raw"><b>gras</b></p>');
    // interpolate : balises échappées
    expect(result).toContain('&lt;b&gt;gras&lt;/b&gt;');
  });

  it('contraste raw vs interpolate : interpolate échappe le HTML', () => {
    const snippet = '<i>italique</i>';
    const result = tao.render('raw-vs-interpolate', { html: snippet });
    expect(result).toContain('&lt;i&gt;italique&lt;/i&gt;');
  });

  it('évalue une expression concaténée en raw', () => {
    const result = tao.render('raw-expression', { label: 'important' });
    expect(result).toContain('<strong>important</strong>');
  });

  it('insère du HTML dans une boucle via raw', () => {
    const result = tao.render('raw-loop', {
      items: ['<em>alpha</em>', '<strong>beta</strong>'],
    });
    expect(result).toContain('<em>alpha</em>');
    expect(result).toContain('<strong>beta</strong>');
  });

  it('insère du HTML avec des attributs en raw', () => {
    const result = tao.render('raw-basic', {
      html: '<a href="https://example.com">lien</a>',
    });
    expect(result).toContain('<a href="https://example.com">lien</a>');
  });
});

// ---------------------------------------------------------------------------
// Balise execute  <% %>
// Exécute du code JavaScript sans produire de sortie directe.
// ---------------------------------------------------------------------------
describe('balise execute (<% %>)', () => {
  it('affiche le bon texte dans la branche if (true)', () => {
    const result = tao.render('execute-condition', { isAdmin: true });
    expect(result).toContain('Admin');
    expect(result).not.toContain('User');
  });

  it('affiche le bon texte dans la branche else (false)', () => {
    const result = tao.render('execute-condition', { isAdmin: false });
    expect(result).toContain('User');
    expect(result).not.toContain('Admin');
  });

  it('itère sur un tableau avec une boucle for...of', () => {
    const result = tao.render('execute-loop', { items: ['pomme', 'banane', 'cerise'] });
    expect(result).toContain('<li>pomme</li>');
    expect(result).toContain('<li>banane</li>');
    expect(result).toContain('<li>cerise</li>');
  });

  it("n'affiche rien si le tableau est vide", () => {
    const result = tao.render('execute-loop', { items: [] });
    expect(result).toContain('<ul>');
    expect(result).not.toContain('<li>');
  });

  it('déclare une variable locale utilisable par interpolate', () => {
    const result = tao.render('execute-variable', { name: 'Alice' });
    expect(result).toContain('Hello, Alice!');
  });

  it('accumule des valeurs dans une variable locale (somme)', () => {
    const result = tao.render('execute-accumulator', { numbers: [1, 2, 3, 4, 5] });
    expect(result).toContain('15');
  });

  it('accumule avec un tableau vide → total = 0', () => {
    const result = tao.render('execute-accumulator', { numbers: [] });
    expect(result).toContain('0');
  });

  it('filtre un tableau avec filter() et affiche les résultats', () => {
    const result = tao.render('execute-combined', { values: [10, 55, 80, 30, 95] });
    expect(result).toContain('<li>55</li>');
    expect(result).toContain('<li>80</li>');
    expect(result).toContain('<li>95</li>');
    expect(result).not.toContain('<li>10</li>');
    expect(result).not.toContain('<li>30</li>');
  });

  it('affiche le message alternatif si aucun résultat après filtre', () => {
    const result = tao.render('execute-combined', { values: [10, 20, 30] });
    expect(result).toContain('Aucun résultat');
    expect(result).not.toContain('<li>');
  });

  it('évalue un switch/case : statut ok', () => {
    const result = tao.render('execute-switch', { status: 'ok' });
    expect(result).toContain('OK');
    expect(result).not.toContain('Warning');
    expect(result).not.toContain('Error');
  });

  it('évalue un switch/case : statut warn', () => {
    const result = tao.render('execute-switch', { status: 'warn' });
    expect(result).toContain('Warning');
    expect(result).not.toContain('OK');
  });

  it('évalue un switch/case : cas default', () => {
    const result = tao.render('execute-switch', { status: 'error' });
    expect(result).toContain('Error');
    expect(result).not.toContain('OK');
    expect(result).not.toContain('Warning');
  });
});

describe('blocs vides et espaces seuls', () => {
  const taoLocal = new Tao({ views: templateViews });

  it("un bloc execute vide <% %> ne génère pas d'erreur et ne produit pas de contenu", () => {
    taoLocal.loadTemplate('@empty-exec', 'before<% %>after');
    const result = taoLocal.render('@empty-exec');
    expect(result).toBe('beforeafter');
  });

  it("un bloc raw vide <%~ %> ne génère pas d'erreur et ne produit pas de contenu", () => {
    taoLocal.loadTemplate('@empty-raw', 'before<%~ %>after');
    const result = taoLocal.render('@empty-raw');
    expect(result).toBe('beforeafter');
  });

  it("un bloc interpolate vide <%= %> ne génère pas d'erreur et ne produit pas de contenu", () => {
    taoLocal.loadTemplate('@empty-interpolate', 'before<%= %>after');
    const result = taoLocal.render('@empty-interpolate');
    expect(result).toBe('beforeafter');
  });
});
