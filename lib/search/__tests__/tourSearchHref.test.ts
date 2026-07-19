import { tourSearchHref } from '../tourSearchHref';

describe('tourSearchHref', () => {
  it('links default-locale tours through the root dynamic route', () => {
    expect(tourSearchHref('sharm-el-sheikh-cairo-day-tour-bus-guide-lunch', 'en'))
      .toBe('/sharm-el-sheikh-cairo-day-tour-bus-guide-lunch');
  });

  it('keeps non-default locale prefixes without adding the invalid tours segment', () => {
    expect(tourSearchHref('/luxor-day-tour/', 'de')).toBe('/de/luxor-day-tour');
  });
});
