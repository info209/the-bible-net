# Bible Plans Library Module - Testing & Troubleshooting Guide

## 🧪 Testing Checklist

### Prerequisites
- [ ] MongoDB is running and connected
- [ ] Authentication is working
- [ ] User is logged in
- [ ] Sample plans have been seeded

### Core Functionality Tests

#### Library Navigation
- [ ] **My Plans Tab**: Opens and shows empty state
- [ ] **Find Plans Tab**: Opens and shows sample plans
- [ ] **Saved Tab**: Opens and shows empty state
- [ ] **Completed Tab**: Opens and shows empty state
- [ ] **Tab Switching**: Smooth transition between tabs
- [ ] **Search**: Search input accepts text

#### Plan Discovery
- [ ] **Plan Cards**: Display all plan information
  - Title visible
  - Duration shows correctly
  - Rating stars visible
  - Author name visible
- [ ] **Action Button**: Shows "Start" for Find Plans tab
- [ ] **Plan Cards Responsive**: Display correctly on mobile/tablet/desktop

#### Starting a Plan
- [ ] **Click "Start"**: Opens plan details screen
- [ ] **Plan Details Screen**:
  - Title, description, duration displayed
  - Difficulty badge visible
  - Days overview shows
  - About section visible
- [ ] **Start Button**: Clicking starts the plan
- [ ] **Loading State**: Shows while plan is being started
- [ ] **Redirect**: Navigates to day list after start

#### Plan Progress View
- [ ] **Progress Tracker**: Shows current progress
  - Day counter (Day X of Y)
  - Progress percentage
  - Completed count
- [ ] **Day List**: Shows all days
  - Current day highlighted
  - Completed days marked with checkmark
  - Can click on days
- [ ] **Navigation**: Can select different days

#### Devotional View
- [ ] **Day Content**: Shows correctly
  - Title visible
  - Scripture reference visible
  - Description shows
- [ ] **Action Buttons**:
  - "Start Reading" button present
  - Clicking opens reading screen
- [ ] **Day Navigation**:
  - Previous button disabled on day 1
  - Next button disabled on final day
  - Can navigate between days

#### Reading Screen
- [ ] **Full Screen**: Takes up entire screen
- [ ] **Content Display**:
  - Scripture reference visible
  - Devotional text readable
  - Reflection questions shown (if present)
- [ ] **Font Controls**:
  - Can increase font size
  - Can decrease font size
  - Changes apply immediately
- [ ] **Scroll Preservation**:
  - Scroll position saved when exiting
  - Scroll position restored when reopening
- [ ] **Close Button**: Exits reading screen
- [ ] **Complete Button**: Marks day as complete

#### Day Completion
- [ ] **Mark Complete**: Marks day as done
- [ ] **Progress Updates**: Day shows as completed
- [ ] **Current Day Advances**: To next day if available
- [ ] **Completion Status**: Previous days remain marked

#### Plan Completion
- [ ] **Final Day**: After last day marked complete
- [ ] **Completion Screen**: Shows congratulations
  - Plan title displayed
  - Stats showing (duration, completed date)
- [ ] **Rating Interface**:
  - Can click stars to rate (1-5)
  - Stars highlight on hover/click
  - Review text area present
- [ ] **Submit Rating**: Saves rating
- [ ] **Redirect**: Returns to library

#### Tab Content After Completion
- [ ] **Completed Tab**: Shows completed plan
- [ ] **My Plans Tab**: Plan removed from active
- [ ] **Find Plans Tab**: Can start another plan
- [ ] **Can Restart**: Completed plan shows "View" button (optional)

#### Save/Unsave Functionality
- [ ] **Save Plan**: Button shows "Save for Later" on Find Plans
- [ ] **Save Success**: Plan moves to Saved tab
- [ ] **Unsave**: Can remove from saved
- [ ] **Continue Saved**: Can start a saved plan from Saved tab

#### Error Handling
- [ ] **No Plans**: Empty state displays when no plans in tab
- [ ] **Network Error**: Shows error message gracefully
- [ ] **Already Started**: Can't start same plan twice
- [ ] **Unauthorized**: Shows login prompt if not authenticated

### Edge Cases

- [ ] **Multiple Active Plans**: Can have several plans in progress
- [ ] **Rapid Tab Switching**: Doesn't break app
- [ ] **Refresh While Reading**: Scroll position restored
- [ ] **Close and Reopen App**: Progress persists
- [ ] **Start Plan Without Completing Previous**: Allowed
- [ ] **Rate After Long Time**: Rating saves correctly
- [ ] **Font Size Large**: Text remains readable
- [ ] **Long Devotional Text**: Scrolls properly
- [ ] **No Reflection**: Day without reflection questions works

### Responsive Design

#### Mobile (320px+)
- [ ] Header text fits
- [ ] Tabs don't overflow
- [ ] Plan cards stack vertically
- [ ] Buttons are touch-friendly (44px minimum)
- [ ] Text is readable at default zoom

#### Tablet (768px+)
- [ ] Grid shows 2 columns
- [ ] Layout looks balanced
- [ ] All elements visible without horizontal scroll

#### Desktop (1024px+)
- [ ] Grid shows 3 columns
- [ ] Layout utilizes screen space well
- [ ] Navigation clear and accessible

## 🐛 Troubleshooting

### Plans Not Loading

**Problem**: Find Plans tab shows empty state
```
Solutions:
1. Verify MongoDB connection
   - Check MONGODB_URI in .env
   - Test connection: mongo <connection_string>

2. Verify seed data exists
   - Run: npx tsx --tsconfig tsconfig.scripts.json src/scripts/seed_plans.ts
   - Check MongoDB: db.plans.find()

3. Check isPublished flag
   - Plans must have isPublished: true
   - Query: db.plans.find({ isPublished: true })

4. Verify API response
   - Open Network tab in DevTools
   - Check /api/v1/plans request
   - Look for errors in response
```

### Can't Start Plan

**Problem**: Start button doesn't work or shows error
```
Solutions:
1. Check authentication
   - Verify user is logged in
   - Check session token in cookies
   - Try logging out and back in

2. Check plan exists
   - Verify plan ID is correct
   - Check in MongoDB: db.plans.findById(planId)

3. Check PlanProgress permissions
   - Ensure collection exists
   - Check MONGODB_URI permissions
   - Verify user has write access

4. Check API response
   - Look at Network → /api/v1/plans/[id]/start
   - Check for error messages
   - Verify authentication header sent
```

### Scroll Position Not Saved

**Problem**: Reading screen doesn't remember scroll position
```
Solutions:
1. Check reading progress API
   - Verify /api/v1/plans/[id]/day/[day] is being called
   - Check Network tab while scrolling
   - Look for errors in console

2. Check initial scroll loading
   - Verify initialScrollPosition prop
   - Check if scrollContainerRef is set correctly
   - Verify useEffect hook runs

3. Check browser storage
   - Scroll position stored in database, not localStorage
   - Verify database update succeeds
   - Check PlanProgress.daysProgress records

4. Clear cache and retry
   - Hard refresh: Ctrl+Shift+R
   - Clear cookies: DevTools → Storage
   - Try different day
```

### Tab Switching Issues

**Problem**: Tab content doesn't update or shows wrong content
```
Solutions:
1. Check API call
   - Verify /api/v1/plans/user/library?tab=my-plans
   - Check all tab names are correct
   - Verify query parameters match backend

2. Clear component state
   - Refresh page
   - Check browser console for errors
   - Look for race conditions in Network tab

3. Verify authentication
   - Ensure user ID is being sent
   - Check session is valid
   - Try re-authenticating
```

### Rating Doesn't Save

**Problem**: Completion rating form doesn't save
```
Solutions:
1. Verify rating is 1-5
   - Check console for validation errors
   - Ensure integer values only
   - Try different ratings

2. Check API endpoint
   - Verify /api/v1/plans/[id]/rate endpoint
   - Check request body includes rating
   - Look for authentication issues

3. Check plan status
   - Can only rate completed plans
   - Verify plan has status: 'completed'
   - Check completedAt date is set

4. Database permissions
   - Ensure write access to PlanProgress
   - Verify MongoDB connection
   - Check for storage limits
```

### UI Elements Not Visible

**Problem**: Buttons, text, or components not showing
```
Solutions:
1. Check Tailwind CSS
   - Verify Tailwind is building (check public/tw-debug.css)
   - Run: npm run build:css
   - Check for CSS conflicts

2. Check z-index conflicts
   - Reading screen might be behind other elements
   - Check z-50 class applied
   - Inspect with DevTools

3. Check component loading
   - Open Network tab
   - Verify BiblePlansLibrary component loads
   - Check for JavaScript errors in console

4. Viewport issue
   - Check if screen is too small
   - Try different zoom level
   - Test in incognito/private mode
```

### Performance Issues

**Problem**: App feels slow or sluggish
```
Solutions:
1. Check Network Performance
   - Open DevTools → Network
   - Look for slow API calls
   - Check for waterfall issues

2. Optimize queries
   - Verify pagination limit (default 20)
   - Check database indexes
   - Consider adding caching (React Query/SWR)

3. Check for re-renders
   - Use React DevTools Profiler
   - Look for excessive re-renders
   - Verify useCallback is used

4. Optimize images
   - Check plan image sizes
   - Use Next.js Image component
   - Compress before upload

5. Monitor memory
   - Open DevTools → Memory
   - Check for memory leaks
   - Look for large component renders
```

## 📊 Database Queries for Debugging

```javascript
// Check all plans
db.plans.find().pretty()

// Check published plans only
db.plans.find({ isPublished: true }).pretty()

// Check user's progress
db.plan_progress.find({ userId: ObjectId("...") }).pretty()

// Check a specific plan's progress
db.plan_progress.find({ planId: ObjectId("...") }).pretty()

// Check completed plans
db.plan_progress.find({ status: "completed" }).pretty()

// Get plan with user progress combined
db.plans.aggregate([
  { $match: { _id: ObjectId("...") } },
  {
    $lookup: {
      from: "plan_progress",
      localField: "_id",
      foreignField: "planId",
      as: "userProgress"
    }
  }
])

// Count plans by category
db.plans.aggregate([
  { $group: { _id: "$category", count: { $sum: 1 } } }
])

// Average ratings
db.plan_progress.aggregate([
  { $match: { rating: { $exists: true } } },
  { $group: { _id: null, avgRating: { $avg: "$rating" } } }
])
```

## 🔍 Console Debugging

```javascript
// In browser DevTools Console

// Check if API is responding
fetch('/api/v1/plans')
  .then(r => r.json())
  .then(console.log)

// Check user session
fetch('/api/auth/session')
  .then(r => r.json())
  .then(console.log)

// Check specific plan
fetch('/api/v1/plans/[planId]')
  .then(r => r.json())
  .then(console.log)

// Test starting a plan
fetch('/api/v1/plans/[planId]/start', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)

// Check localStorage
localStorage.getItem('next-auth.session-token')

// Check cookies
document.cookie
```

## 📝 Reporting Issues

When reporting bugs, include:
1. **Browser/Device**: Chrome on Windows, Safari on iOS, etc.
2. **Steps to reproduce**: Clear sequence of actions
3. **Expected behavior**: What should happen
4. **Actual behavior**: What actually happens
5. **Screenshot/Video**: Visual confirmation
6. **Console errors**: Any error messages
7. **Network tab**: API call failures
8. **Database state**: Relevant MongoDB records

## ✅ Pre-Launch Checklist

- [ ] All tests passing
- [ ] No console errors in production
- [ ] API endpoints responding correctly
- [ ] Database backups in place
- [ ] Seed data tested
- [ ] Performance acceptable
- [ ] Mobile views tested
- [ ] Error states handled
- [ ] Documentation complete
- [ ] Team trained on features

---

**Document Version**: 1.0.0
**Last Updated**: April 22, 2026
