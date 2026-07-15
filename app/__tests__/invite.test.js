import { buildInviteLink, buildInviteMessage } from '../utils/invite';

describe('buildInviteLink', () => {
  test('arma el link https con el código', () => {
    expect(buildInviteLink('https://api.moodmatch.app', 'abc-123'))
      .toBe('https://api.moodmatch.app/invite/abc-123');
  });

  test('tolera barra final en la URL base', () => {
    expect(buildInviteLink('https://api.moodmatch.app/', 'abc-123'))
      .toBe('https://api.moodmatch.app/invite/abc-123');
  });

  test('codifica caracteres especiales del código', () => {
    expect(buildInviteLink('https://api.moodmatch.app', 'a b/c'))
      .toBe('https://api.moodmatch.app/invite/a%20b%2Fc');
  });
});

describe('buildInviteMessage', () => {
  test('incluye el nombre de quien invita y el link', () => {
    const msg = buildInviteMessage('Ana', 'https://api.moodmatch.app', 'abc-123');
    expect(msg).toContain('Ana te invita a MoodMatch');
    expect(msg).toContain('https://api.moodmatch.app/invite/abc-123');
  });
});
