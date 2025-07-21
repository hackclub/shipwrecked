# Shipwrecked AltStore Repo

## Guide for adding your app!


### Step 1 - Upload your .ipa file
- Upload your .ipa file to either the #cdn channel on the Hack Club Slack, or another service, I created a GitHub release for my app.
- Make sure the URL is accessible, and that you can download it through an incognito window
> Mark down the file size in bytes, you'll need it later!

### Step 2 - Prepare Your Content
- First of all, you'll need an app icon, recommended as a 1024x1024 PNG file, as well as screenshots, I'd recommend 3-4, and also a description of your app's features and functionality.

### Step 3 - Fork this repo and edit the [altstore.json](altstore.json) file
- Add your app to the `apps` array in [altstore.json](altstore.json), using the template below / in [AltStore Example.json](AltStoreExample.json)

```
      {
        "name": "My Example App",
        "bundleIdentifier": "com.exampledeveloper.exampleapp",
        "marketplaceID": "",
        "developerName": "Example Developer",
        "subtitle": "An awesome app.",
        "localizedDescription": "This is an awesome app only available on AltStore.",
        "iconURL": "https://test.jpeg",
        "tintColor": "#22b0e3",
        "category": "other",
        "screenshots": [],
        "versions": [],
        "appPermissions": {
          "entitlements": [],
          "privacy": {}
        }
```

### Step 4 - Fill in your details!

#### Required fields, you **MUST** have these for your app to work on AltStore

- **Name** - Your app's display name
- **bundleIdentifier** - Your app's unique bundle ID, which is typically com.YOURNAME.APPNAME
- **developerName** - Either your name, or your organisation
- **subtitle** - Brief one line description
- **localizedDescription** - Your full app description
    > Remember to not go crazily into detail for the description!
- iconURL - Link to your app's icon, I'd recommend using #cdn on the Hack Club Slack
- downloadURL - The .ipa download url we made in Step 1!
- size - The size of your .ipa in bytes, you should've noted this down in Step 1
- version - Your app version, if you're not sure what version it should be, [check this out!](https://semver.org/)
- date - Release date in ISO 8601 format 

#### Optional fields
- tintColor - The hex color code for your app's theme
- screenshots - An array of screenshot URL's, I'd recommend using the #cdn channel on the Hack Club Slack for this!
- buildVersion - Your internal build number 
    > Make sure that this checks out with your internal build number on EAS/whichever service you use!
- minOSVersion - The minimum iOS version that is required to use your app
- category - The app category
    > This must be one of the below values. If no category is provided it will default to other
    - developer
    - entertainment
    - games
    - lifestyle
    - other
    - photo-video
    - social
    - utilities

### Step 5 - Submit Your Changes
1. Make sure your app has been added to the apps array in [altstore.json](altstore.json), and that you've filled out all the required fields.
2. If you want your app to be featured, add it's bundleID to the featuredApps array in [altstore.json](altstore.json)
3. You can now create a pull request with a clear description of your app + your Shipwrecked user name.