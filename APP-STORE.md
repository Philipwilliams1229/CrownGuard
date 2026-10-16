# Crownguard on the App Store: the step-by-step

This is the checklist for getting Crownguard onto your iPhone and iPad, and
later onto the App Store. Do it on your Mac, top to bottom. Each step says what
you should see. If anything looks different, stop and paste what you see
(or a screenshot) into a Claude session.

The game itself doesn't change: the app is the same game you play in the
browser, wrapped in a thin iPhone/iPad shell (Capacitor). Claude keeps working
on the game in the cloud as usual. Your Mac is only for building the app and
sending it to Apple.

---

## Part 1 — One-time setup (about an hour, most of it downloading)

**1. Install Xcode.** Open the **App Store** app on your Mac, search
**Xcode**, click **Get**. It's huge (tens of GB), so let it run.
- If the App Store says your macOS is too old for Xcode, tell Claude your
  Mac's model and macOS version (Apple menu → About This Mac).

**2. Open Xcode once.** Agree to the licence. When it asks which platforms
you want, keep **iOS** ticked and let it download. Then quit Xcode.

**3. Install Node.js.** Go to **https://nodejs.org**, download the button
marked **LTS**, open the `.pkg` file and click through the installer.

**4. Get the game onto your Mac.** Open **Terminal** (press ⌘ Space, type
`Terminal`, press Return). Copy these lines, paste them into Terminal and
press Return:

```
cd ~/Documents
git clone https://github.com/Philipwilliams1229/CrownGuard.git
cd CrownGuard
npm ci
```

You now have a `CrownGuard` folder in Documents. If macOS pops up "install
command line developer tools", click **Install**, wait, then paste the lines
again. (The repository is public, so no GitHub login is needed to download
it. You never push from the Mac; Claude does that.)

**5. Sign Xcode into your developer account.** Open Xcode → menu
**Xcode → Settings… → Accounts** → the **+** at the bottom left →
**Apple Account** → sign in with the Apple ID your developer membership is on.

---

## Part 2 — See it run on the Mac (the Simulator)

**6. Build and open the project.** In Terminal (still in the `CrownGuard`
folder; if you closed it, first paste `cd ~/Documents/CrownGuard`):

```
npm run ios
```

After a few seconds Xcode opens the project. The first time, the bar at the
top says **Fetching packages** / **Resolving packages** for a minute or two.
Wait for that to finish.

**7. Pick your team (one time only).** In Xcode's left column click the blue
**App** icon at the very top. In the middle, under **TARGETS**, click **App**,
then the **Signing & Capabilities** tab. Make sure **Automatically manage
signing** is ticked, and set **Team** to your name / your developer team.
The red errors there should go away.

**8. Run it.** At the top of the Xcode window, next to **App ›**, there's a
device menu. Pick a simulator such as **iPhone 17 Pro** (any recent iPhone or
iPad is fine). Press the **▶** button (or ⌘R). A phone appears on screen and
Crownguard starts. To turn the simulator sideways, press ⌘→.

If Xcode says a simulator or "iOS platform" needs downloading, click
**Get** / **Download** and wait.

---

## Part 3 — Put it on your real iPhone and iPad (TestFlight)

TestFlight is Apple's way of installing test versions. It's also how you'll
playtest everything that hasn't been tested yet.

**9. Create the app's page in App Store Connect (one time only).** Go to
**https://appstoreconnect.apple.com** → **Apps** → the blue **+** →
**New App**:
- Platforms: **iOS**
- Name: **Crownguard** (if it's taken, try something like
  **Crownguard: Tower Defense**; the name on your home screen stays
  "Crownguard")
- Primary language: **English (U.S.)**
- Bundle ID: pick **com.philipwilliams.crownguard** from the list. If it's
  not there, do step 7 first; picking your team registers it.
- SKU: `crownguard`
- User Access: **Full Access**

Click **Create**.

**10. Make the build and upload it.** In Xcode, set the device menu at the
top (where you picked the simulator) to **Any iOS Device (arm64)**. Then menu
**Product → Archive**. Wait a few minutes. A window called **Organizer**
opens with your archive selected. Click **Distribute App** →
**App Store Connect** → **Distribute** (keep the defaults). It uploads.

**11. Wait for Apple to process it** (10–30 minutes; you get an email). Then
in App Store Connect open your app → **TestFlight** tab:
- If it asks about **encryption / export compliance**, answer "None of the
  algorithms mentioned above" / no. (The app already says so, so normally it
  won't ask.)
- Under **Internal Testing**, click **+** to make a group (call it "Me"),
  and add yourself as a tester.

**12. Install it on your phone and iPad.** On each device, install the free
**TestFlight** app from the App Store and sign in with the same Apple ID.
Crownguard shows up there. Tap **Install**. It appears on your home screen
like any app.

Your saved progress from the browser does **not** carry over by itself. To
bring it: in the browser game, Settings → Progress → copy the save code. In
the app, Settings → Progress → paste it → Restore.

---

## Part 4 — Every time there's a new version

When Claude has pushed changes and you want them on your devices:

```
cd ~/Documents/CrownGuard
git pull
npm ci
npm run ios
```

Then in Xcode: **Product → Archive** → **Distribute App** → **App Store
Connect** → **Distribute**. About half an hour later TestFlight on your
phone offers the update.

Xcode raises the build number by itself when it uploads. If it ever
complains that a build number was already used: click the blue **App** icon
→ **TARGETS: App** → **General** tab → add 1 to **Build** → archive again.

---

## Part 5 — Releasing it on the App Store (later, when it's ready)

Not yet. When you want to, ask Claude to help with each of these in App Store
Connect:
- **Screenshots**: Apple wants iPhone shots (6.9-inch) and iPad shots
  (13-inch). The simulator makes them (⌘S saves one to the Desktop).
- **Description, keywords, subtitle**: Claude can write them.
- **Privacy Policy URL**:
  `https://philipwilliams1229.github.io/CrownGuard/privacy.html`
- **App Privacy** questionnaire: **Data Not Collected** (the game collects
  nothing).
- **Support URL**: a page with a way to reach you. Tell Claude which email
  to put on it.
- **Age rating** questionnaire: cartoon/fantasy violence, nothing else.
- **Price**: Free.
- Then **Add for Review** → **Submit**. Apple's review usually takes a day
  or two.

## Android, one day

Same game, same shell: Claude adds an Android project next to the iOS one.
You'd need a Google Play developer account ($25 once). New personal accounts
must run a closed test with at least 12 testers for 14 days before they can
publish, so start that early when the time comes.
