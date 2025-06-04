import { Tao } from '../src/index';
import path from 'path';

const templateViews = path.join(process.cwd(), 'test copy/templates');

describe('advanced render tests (helpers, etc)', () => {
  it('should support local and global helpers in templates', () => {
    const tao = new Tao({ views: templateViews });

    tao.defineHelpers({
      nPlusTwo: (n: number) => n + 2,
    });

    const n = 5;

    const result = tao.render(
      '/helpers',
      { n },
      {
        nPlusOne: (n: number) => n + 1,
      }
    );

    expect(result).toContain('<p>n: 5</p>');
    expect(result).toContain('<p>n + 1: 6</p>');
    expect(result).toContain('<p>n + 2: 7</p>');
  });

  it('should render complex template using local and global helpers with logic and formatting', () => {
    const tao = new Tao({ views: templateViews });

    tao.defineHelpers({
      upper: (str: string) => str.toUpperCase(),
      formatDate: (d: string) => d.split('T')[0],
    });

    const data = {
      user: {
        name: 'alice',
        lastLogin: new Date('2025-05-30T15:00:00Z'),
        roles: ['editor', 'manager'],
        projects: [
          {
            title: 'New Platform',
            team: [{ name: 'Bob' }, { name: 'Clara' }],
          },
          {
            title: 'Security Audit',
            team: [{ name: 'Dan' }],
          },
        ],
      },
    };

    const localHelpers = {
      isManager: (roles: string[]) => roles.includes('manager'),
      listTeam: (team: { name: string }[]) => team.map((m) => m.name).join(', '),
    };

    const result = tao.render('advanced-helpers', data, localHelpers);

    expect(result).toContain('<h1>User: ALICE</h1>');
    expect(result).toContain('<p>Last login: 2025-05-30</p>');
    expect(result).toContain('<p class="badge">Manager Access</p>');
    expect(result).toContain('<h2>New Platform</h2>');
    expect(result).toContain('<p>Team: Bob, Clara</p>');
    expect(result).toContain('<h2>Security Audit</h2>');
    expect(result).toContain('<p>Team: Dan</p>');
  });
});
