import {
  askHostedAISearch,
  HOSTED_AI_SEARCH_OPEN_EVENT,
  HOSTED_AI_SEARCH_SCRIPT_ID,
} from '@/lib/hostedAISearch';

// A visitor's "Ask AI" must always reach the hosted AI trip search with their
// question: in place when the launcher runs on this page, otherwise on the
// search page, whose launcher opens the same pending request when it boots.
describe('askHostedAISearch', () => {
  let opened: CustomEvent[];
  const record = (event: Event) => opened.push(event as CustomEvent);

  const mountLauncherScript = () => {
    const script = document.createElement('script');
    script.id = HOSTED_AI_SEARCH_SCRIPT_ID;
    document.body.appendChild(script);
  };

  beforeEach(() => {
    jest.useFakeTimers();
    opened = [];
    window.__foxesSearchPending = null;
    window.addEventListener(HOSTED_AI_SEARCH_OPEN_EVENT, record);
  });

  afterEach(() => {
    window.removeEventListener(HOSTED_AI_SEARCH_OPEN_EVENT, record);
    document.getElementById(HOSTED_AI_SEARCH_SCRIPT_ID)?.remove();
    window.__foxesSearchPending = null;
    jest.useRealTimers();
  });

  it("asks the hosted assistant in AI mode with the visitor's own words", () => {
    mountLauncherScript();
    askHostedAISearch({ query: '  Which pyramids tour do you recommend?  ', locale: 'de' }, jest.fn());

    expect(opened).toHaveLength(1);
    expect(opened[0].detail).toEqual({
      query: 'Which pyramids tour do you recommend?',
      mode: 'ai',
      locale: 'de',
      destinationSlug: undefined,
    });
    expect(window.__foxesSearchPending).toEqual(opened[0].detail);
  });

  it('stays on the page once the launcher accepts the request', () => {
    mountLauncherScript();
    const navigate = jest.fn();
    askHostedAISearch({ query: 'Nile cruise', locale: 'en' }, navigate);

    window.__foxesSearchPending = null; // what the launcher does when it accepts
    jest.advanceTimersByTime(20_000);

    expect(navigate).not.toHaveBeenCalled();
  });

  it('carries an unaccepted question to the search page and keeps it for that launcher', () => {
    mountLauncherScript();
    const navigate = jest.fn();
    const request = askHostedAISearch({ query: 'Best time to visit Luxor?', locale: 'ar' }, navigate);

    jest.advanceTimersByTime(2199);
    expect(navigate).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);

    expect(navigate).toHaveBeenCalledWith('/ar/search?q=Best%20time%20to%20visit%20Luxor%3F');
    expect(window.__foxesSearchPending).toBe(request);
  });

  it('goes straight to the search page where no launcher runs (checkout, sign-in, tools)', () => {
    const navigate = jest.fn();
    const request = askHostedAISearch({ query: 'Desert safari', locale: 'en' }, navigate);

    expect(navigate).toHaveBeenCalledWith('/search?q=Desert%20safari');
    expect(window.__foxesSearchPending).toBe(request);
  });

  it('drops a carried question no launcher picks up, so it cannot open later on another page', () => {
    askHostedAISearch({ query: 'Desert safari', locale: 'en' }, jest.fn());

    jest.advanceTimersByTime(14_999);
    expect(window.__foxesSearchPending).not.toBeNull();
    jest.advanceTimersByTime(1);
    expect(window.__foxesSearchPending).toBeNull();
  });

  it('acts only on the latest request and opens an empty assistant without a question', () => {
    mountLauncherScript();
    const navigate = jest.fn();
    askHostedAISearch({ query: 'first question', locale: 'en' }, navigate);
    const latest = askHostedAISearch({ query: '', locale: 'xx' }, navigate);

    expect(latest).toMatchObject({ query: '', mode: 'ai', locale: 'en' });
    jest.advanceTimersByTime(2200);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/search');
  });
});
