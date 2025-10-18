# Testing Documentation - Tour Ticket Platform

Welcome to the testing documentation for the Tour Ticket platform. This guide will help QA team members get started with testing.

## 📚 Available Testing Resources

We've created comprehensive testing materials to help you test the platform effectively:

### 1. **QA_TESTING_GUIDE.md** - Complete Testing Guide
The main comprehensive testing document covering:
- 200+ detailed test cases
- All features and modules
- Browser and device testing
- Performance and security testing
- Bug reporting guidelines
- Pre-launch checklists

**Use this for:** In-depth testing, feature testing, comprehensive QA

### 2. **QUICK_TEST_CHECKLIST.md** - Quick Reference Checklist
A streamlined checklist for daily testing:
- Critical path smoke tests
- Daily regression tests
- Quick mobile tests
- Pre-deployment checklist
- Bug severity guide

**Use this for:** Daily smoke tests, quick verification, regression testing

### 3. **QA_BUG_TRACKING_TEMPLATE.csv** - Bug Tracking Spreadsheet
A CSV template for tracking bugs:
- Bug ID and tracking
- Severity and priority
- Steps to reproduce
- Expected vs actual results
- Status tracking

**Use this for:** Logging and tracking bugs

### 4. **POSTMAN_API_TESTS.json** - API Test Collection
A complete Postman collection with:
- 50+ API endpoint tests
- Authentication tests
- Tours, bookings, checkout tests
- Admin API tests
- Automated test scripts

**Use this for:** API testing, backend testing, integration testing

### 5. **Automated Test Scripts** - Jest Test Files
Located in `__tests__/` directory:
- Component tests
- Integration tests
- API tests
- Price calculation tests

**Use this for:** Automated testing, CI/CD integration

---

## 🚀 Getting Started

### For Manual Testers

1. **Read:** Start with `QA_TESTING_GUIDE.md` sections 1-4 to understand the app
2. **Set up:** Get test accounts and environment access (section 2 & 3)
3. **Test:** Use `QUICK_TEST_CHECKLIST.md` for daily smoke tests
4. **Report:** Log bugs using `QA_BUG_TRACKING_TEMPLATE.csv`

### For API Testers

1. **Install:** Get Postman from https://www.postman.com/downloads/
2. **Import:** Import `POSTMAN_API_TESTS.json` into Postman
3. **Configure:** Set environment variables (baseUrl, authToken)
4. **Run:** Execute the collection and review results

### For Automation Engineers

1. **Install dependencies:** `pnpm install`
2. **Review tests:** Check `__tests__/` directory
3. **Run tests:** `pnpm test`
4. **Add tests:** Create new test files in `__tests__/`
5. **Check coverage:** `pnpm test:coverage`

---

## 📋 Daily Testing Workflow

### Morning (15 minutes)
1. Open `QUICK_TEST_CHECKLIST.md`
2. Run critical path tests
3. Check for any overnight issues
4. Log any bugs found

### During Development (as needed)
1. Test new features as they're deployed
2. Run regression tests for affected areas
3. Log bugs immediately with screenshots

### Before Release (1-2 hours)
1. Complete pre-deployment checklist
2. Run full test suite from `QA_TESTING_GUIDE.md`
3. Verify all critical bugs are fixed
4. Sign off on release

---

## 🎯 Testing Priorities

### P1 - Critical (Test Every Day)
- Homepage loads
- User can search tours
- User can book a tour
- Payment processing works
- Emails are sent
- Admin panel accessible

### P2 - High (Test 2-3x per week)
- User registration/login
- Tour detail pages
- Cart functionality
- User dashboard
- Review system

### P3 - Medium (Test weekly)
- Destinations pages
- Categories pages
- Blog functionality
- Admin features (create/edit)

### P4 - Low (Test before releases)
- UI/UX refinements
- Content updates
- Non-critical features

---

## 🔧 Testing Tools

### Recommended Tools

**Browser Testing:**
- Chrome DevTools (F12)
- Firefox Developer Tools
- Safari Web Inspector

**Performance:**
- Lighthouse (built into Chrome)
- WebPageTest
- GTmetrix

**Accessibility:**
- WAVE Browser Extension
- axe DevTools
- Lighthouse Accessibility

**API Testing:**
- Postman (provided collection)
- Insomnia
- curl (command line)

**Cross-Browser:**
- BrowserStack
- LambdaTest
- Local browser installations

**Bug Tracking:**
- Provided CSV template
- Jira, Linear, or GitHub Issues
- Screenshots (Snagit, Lightshot)

**Mobile Testing:**
- Chrome DevTools Device Mode
- Real devices (iOS/Android)
- BrowserStack mobile

---

## 🐛 Bug Reporting Process

### When you find a bug:

1. **Verify it's reproducible**
   - Try to reproduce 2-3 times
   - Test in different browser if needed

2. **Check if already reported**
   - Search existing bug list
   - Avoid duplicates

3. **Capture evidence**
   - Take screenshots/video
   - Copy console errors
   - Note browser/device

4. **Log the bug**
   - Use bug template
   - Fill all required fields
   - Assign appropriate severity

5. **Notify team**
   - For P1 bugs: Immediate notification
   - For P2 bugs: Same day notification
   - For P3/P4: Log and review in daily standup

### Bug Report Must Include:
- Clear title
- Steps to reproduce
- Expected result
- Actual result
- Browser/device
- Screenshot/video
- Severity level

---

## 📊 Test Metrics to Track

### Weekly Metrics
- Total test cases executed
- Pass/fail rate
- Bugs found (by severity)
- Bugs fixed
- Test coverage %

### Monthly Metrics
- Feature testing completion %
- Regression test completion
- Average bug fix time
- Critical bugs in production

---

## 🎓 Learning Resources

### Understanding the Application
- Read `README.md` for technical overview
- Review `types/index.ts` for data structures
- Check `/app` directory for page structure

### Testing Best Practices
- [Software Testing Fundamentals](http://softwaretestingfundamentals.com/)
- [ISTQB Certification](https://www.istqb.org/)
- [Google Testing Blog](https://testing.googleblog.com/)

### Tools Documentation
- [Postman Learning Center](https://learning.postman.com/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/)

---

## 👥 Team Contacts

**Development Team:** [Dev team contact]
**QA Lead:** [QA lead contact]
**Project Manager:** [PM contact]
**Bug Triage:** [Meeting schedule]

---

## 🔄 Test Environment URLs

**Development:** http://localhost:3000
**Staging:** [Your staging URL]
**Production:** [Your production URL]

---

## 📝 Quick Command Reference

```bash
# Run development server
pnpm dev

# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Build for production
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint
```

---

## ❓ FAQ

**Q: Where do I start if I'm new?**
A: Read the "Getting Started" section above, then work through the Quick Test Checklist.

**Q: How do I access the staging environment?**
A: Contact the development team for credentials and URL.

**Q: What if I find a critical bug?**
A: Log it immediately with P1 severity and notify the team on Slack/email.

**Q: How often should I run the full test suite?**
A: Run critical paths daily, full suite before each release.

**Q: Can I add my own test cases?**
A: Yes! Add them to the guide and notify the QA lead.

**Q: What's the difference between the guide and checklist?**
A: Guide is comprehensive (200+ tests), checklist is quick daily tests.

**Q: How do I use the Postman collection?**
A: Import the JSON file into Postman and set the environment variables.

**Q: Where do I report bugs?**
A: Use the provided CSV template or your team's bug tracking tool.

---

## 📅 Testing Schedule

### Daily
- Smoke tests (Quick Checklist)
- New feature testing
- Bug verification

### Weekly
- Regression testing
- Performance testing
- Security checks

### Before Each Release
- Full test suite
- Cross-browser testing
- Mobile testing
- Pre-deployment checklist

### Monthly
- Comprehensive regression
- Accessibility audit
- Performance audit
- Documentation review

---

## ✅ Test Sign-off Criteria

Before approving a release, ensure:

- [ ] All P1 bugs fixed
- [ ] All P2 bugs fixed or documented
- [ ] Critical path 100% passing
- [ ] No console errors
- [ ] Performance meets targets
- [ ] Cross-browser tested
- [ ] Mobile tested
- [ ] Accessibility checked
- [ ] Security verified
- [ ] Documentation updated

---

## 📞 Support

If you have questions:
1. Check this documentation
2. Review the comprehensive guide
3. Ask in team chat
4. Contact QA lead
5. Schedule pairing session

---

**Happy Testing! 🧪**

*Remember: Quality is everyone's responsibility, but testing is our superpower!*
