import { Tao } from '../src';
import path from 'path';

const templateViews = path.join(process.cwd(), 'test copy/templates');
const tao = new Tao({ views: templateViews, metrics: false });

describe('complex render tests', () => {
  it('should render a more complex template with more data', () => {
    const data = {
      user: {
        name: 'Alice',
        email: 'alice@example.com',
        roles: ['admin', 'editor'],
        isActive: true,
      },
    };

    const result = tao.render('complex', data);
    expect(result).toContain(`<div class="user-card">
  <h2>Alice</h2>
  <p>Email: alice@example.com</p>`);
  });

  it('should render a more complex template 2 with more data', () => {
    const data = {
      user: {
        name: 'Alice',
        email: 'alice@example.com',
        roles: ['admin', 'editor'],
        isActive: true,
      },
    };

    const result = tao.render('complex', data);

    expect(result).toContain(`<div class="user-card">
  <h2>Alice</h2>
  <p>Email: alice@example.com</p>`);
    expect(result).toContain('<li class="highlight">admin</li>');
    expect(result).toContain('<li class="">editor</li>');
    expect(result).toContain('<span class="badge active">Active</span>');
  });

  it('should render a fully dynamic complex template with helper', () => {
    function formatDate(date: string) {
      return date.split('T')[0];
    }

    const data = {
      user: {
        name: 'Alice',
        lastLogin: new Date('2024-12-01T10:00:00Z'),
        projects: [
          {
            title: 'Migration',
            description: 'Move services to the new stack',
            active: true,
            tags: ['infra', 'urgent'],
            team: [
              { name: 'Bob', role: 'dev' },
              { name: 'Clara', role: 'lead' },
            ],
          },
          {
            title: 'Refactor UI',
            description: 'Update components and design',
            active: false,
            tags: ['frontend'],
            team: [],
          },
        ],
      },
    };

    const result = tao.render('complex-3', data, { formatDate });

    expect(result).toContain('<h1>Welcome, Alice</h1>');
    expect(result).toContain('Last login: 2024-12-01');
    expect(result).toContain('<article class="project active">');
    expect(result).toContain('<li class="tag">infra</li>');
    expect(result).toContain('<span class="member lead">Clara</span>');
    expect(result).toContain('<article class="project archived">');
  });
});
