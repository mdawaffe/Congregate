Congregate
==========

Swarm: _noun_ - a large, moving group.

Congregate uses the [Foursquare Personalization API][1] to download your Swarm
history.

This tool can be run as a script locally or run as a service on a server. In
the latter case, Congregate can receive real time checkin notifications from
Swarm making its knowledge of your history "live".

In either case, you will need a Foursquare Developer Project (an OAuth app)
and an OAuth token. Congregate does not help create either of those :)

Congregate is the simplest (to create, not to run), dumbest implementation of a
Foursquare data fetcher :) It is not fancy. That means it is not a
click-and-you're-done tool :( Congregate takes some effort to set up.

[1]: https://docs.foursquare.com/developer/reference/personalization-api-overview


Assumptions
-----------

Congregate makes some assumptions about your knowledge and experience. It
assumes you:
* Are comfortable on the command line,
* Have PHP installed on your machine or server, and
* For a server setup (as opposed to a local setep), know how to configure a web
  server.

If you don't meet any of those assumptions, you are probably a more interesting
person that I am :) Sadly, though, Congregate is not smart enough to help you.


OAuth Setup
-----------

If you are familiar with the OAuth2 authentication flow, this process will be
annoying. If you are not familiar, it will be exasperating.

1. Go to https://foursquare.com/developers/home and sign in with your
   Foursquare account.
2. Click "Create a new project" and enter a memorable project name.
3. Copy the Client Id and the Client Secret and paste them into a file in this
   directory called `.oauth`. The Client Id should be on the first line, and
   the Client Secret on the second. It will look something like:
   ```
   DUJNVAOR5EDNCGDLTV5MHQESDHKIBX110SBAMXP5LGHO2D4M
   3KYIELL0PHFWNVPHXC2N4WYXYNULXYBMCTNY4SVDBOTOB5JQ
   ```
4. Generate an OAuth token for your Swarm account. You can do this in several
   ways none of which is pleasant. One "simple", **insecure** way to do this is
   by using [Auth.Website][2] - a dynamic OAuth2 client:
   1. On your Foursquare Developer Project's settings page (the page where you
      got the Client Id and Client Secret) enter
      `https://auth.website/oauth2/?action=receive`
      into the Redirect URL field then click Save.
   2. At Go to https://auth.website/oauth2/ and fill in the details:
      * Grant Type: `Authorization Code`
      * Authorization URL: `https://foursquare.com/oauth2/authenticate`
      * Token URL: `https://foursquare.com/oauth2/access_token`
      * Client ID: The Client Id Foursquare generated for you above
      * Client Secret: The Client Secret Foursquare generated for you above
      * Scope: leave blank
      * Extra: leave blank
   3. Click Submit and go through Foursquare's connection flow with your
      Foursquare account.
   4. Once you're back at https://auth.website, you should see something like
      ```
      RESPONSE: {
          "access_token": "MQQZ4UBXSLEV5DPERRV5TOZEEROI515DQ1FZE5H4GOC1O6VD"
      }
      ```
      Copy the access token (the `MQQ…` part above) without the quotation marks
      and paste it into a file called `.access-token` in this directory.
   5. Once you've created and saved the `.access-token` file, on
      https://auth.website, click "Go back" and then "Clear".

Now that you have the required access token, Congregate can start making
requests to the Foursquare API to retrieve your checkins. Before fetching the
data, you need to decide whether you want to use Congregate as a local script
or hosted on a server.

[2]: https://auth.website/oauth2/


Local Script vs. Server Hosted
------------------------------

Congregate can run locally on your machine or can be hosted on a server.

Local:
* Pro: Easier to set up.
* Pro: Your Foursquare/Swarm data never leaves your machine. Security!
* Con: Harder to view your data.
* Con: Cannot receive real time notifications from Swarm.

Server:
* Pro: Easy to view your data (once it's set up).
* Pro: Can optionally receive real time notifications from Swarm.
* Con: Requires a server :)
* Con: Harder to set up.
* Con: More things to go wrong.


### Local Setup

1. Clone this repo to your local machine.
2. Go through the OAuth Setup above.
3. Complete the Initial Sync steps below.
4. Run `./local.sh` then go to `http://localhost:3333`.

(Running `./local.sh` may cause your computer to ask if you want to allow
PHP to accept incoming connections. For this purpose, yes, you do.)

At this point, you should see most of the data for your checkins. The initial
sync is not able to fetch *all* of the data, though. To complete the sync
process, see Continued Sync below.


### Server Setup

1. Clone this repo to your server.
2. Go through the OAuth Setup above.
3. Configure nginx, Apache, or your webserver of choice.
   * The docroot should be the `client/` directory of your clone of this repo.
   * If your server is publically accessible, ensure you have some sort of
     authentication layer. Basic Authentication (implemented in nginx with
     `auth_basic` and friends) is the simplest. Note that if you want real
     time checkin notifications from Foursquare, you'll need to exclude
     `receive.php` (or whatever custom URL you choose) in the authentication
     configuration. See below for more information about real time
     notifications.
   * Configure your webserver to gzip or otherwise compress the JSON files it
     serves. Congregate serves your checkin data as one (very) large JSON file.
     Without compression, some browsers will not cache the request, and viewing
     your data will be slow. In nginx, the following is a reasonable place to
     start:
     ```
     gzip on;
     gzip_min_length 1024;
     gzip_comp_level 9;
     gzip_types application/json;
     gzip_vary on;
     gzip_proxied any;
     ```
4. Complete the Initial Sync below.
5. Run `php build.php` to build the data for the website. (In the Local Setup
   instructions above, `./local.sh` above does this step for you. For server
   sites, you need to run the build step separately.)
6. Go to your site's URL.

At this point, you should see most of the data for your checkins. The initial
sync is not able to fetch *all* of the data, though. To complete the sync
process, see Continued Sync below.


Initial Sync
------------

Congregate's initial sync will _likely_ be able to download:
* Your user account details,
* _Some_ of the data for all of the venues you've visited,
* _Some_ of the data for all of the venues you've liked,
* All of the photos you've added to your Swarm checkins,
* _Some_ of the data for all of your Swarm checkins,
* All of your Foursquare lists,
* All of your Foursquare tips, and
* All of your Foursquare tastes.

I say "likely" because it depends on how many Swarm checkins you've made. If
you've made fewer than ~50,000 checkins, this first sync should be able to
complete the above list.

If the initial sync does not get all the checkins, Continued Sync (below) will.

To start the initial sync, run:
```
php pull.php
```

The initial sync will take several minutes. It will show some output about what
it's doing, but there's no progress bar to help estimate when it will finish.

When it finishes, it should output one of:
* `DONE` - In this case, the initial sync is completed.
* `ERROR` - Congregate is not configured correctly. You'll need to fix whatever
  it's complaining about.
* `RATE LIMIT EXCEEDED` - This is fine. Either:
  1. The initial sync completed and Congregate moved on to Continued Sync, or
  2. You have so many checkins that the initial sync can't finish in one run.
  In either case, Contined Sync (see below) will pick up where Congregate left
  off.

It's also possible you'll see some ugly PHP errors. If you do, it's probably
because the Foursquare API glitched. Just rerun `php pull.php` and Congregate
will pick up where it left off.


Continued Sync
--------------

The initial sync is able to fetch most of your checkins' data but not all. This
is a constraint of the Foursquare API: the initial sync can fetch your checkins
and their venues quickly, but the response the Foursquare API returns for each
checkin and venue is only a partial/short representation. To get the full/long
representation, Congregate must fetch additional data for each checkin and
venue.

That's what the continued sync process does: fetch the additional data.
Additionally, Continued sync is also used to fetch any future Swarm checkins
you make: you need to *continue* to run this sync process to keep up with your
new data.

Because of Foursquare's API rate limiting, continued sync for your existing
checkins may take a long time. The API only allows Congregate to download ~500
checkins per hour.

In an ideal scenario where everything is fully automated, an account with
10,000 checkins will take **most of a day** to fully sync. After continued sync
has caught up with your existing checkins, future syncs will be pretty fast
since they'll only need to fetch any new checkins.

Continued sync can be run manually or can be automated.


### Manual Sync

Simple. Run:
```
php pull.php
```

The command for continued sync is the same as the one for initial sync.

As above, the command should output one of:
* `DONE` - You are done. Rerun the script every once in a while to sync your
  new checkins.
* `ERROR` - You need to fix something.
* `RATE LIMIT EXCEEDED` - Congregate could not get all your data this run. Keep
  running `php pull.php` until you see `DONE`. **BUT**! You can only run it
  about once an hour. (Once every 65 minutes is about as fast as the Foursquare
  API will allow.)

After each `php pull.php` (regardless of whether or not it outputs `DONE`), you
can run:
```
php build.php
```

That will rebuild the data for the website with the newly synced updates.

Instead of calling `php pull.php` and `php build.php` separately, you can also
call:
```
./pull-and-build.sh
```
which will do both steps in one command.

Manual Sync is simple, but annoying since you have to remember to keep running
`php pull.php`. Automated sync takes care of that for you, but can be pretty
annoying to set up.


### Automated Sync

You're mostly on your own here :)

For local setups, I suggest using `at`. `./pull-with-retry.sh` is a potentially
helpful script. Note the comments in that script about how `at` works on MacOS.

For server setups, I suggest using cron. For maximum sync speed, use something
like the example `crontab.fastest`. After your existing, historical data is
synced, you can switch to a much simpler crontab to fetch future checkins.
E.g., a single hourly or daily entry.

Also note that you probably want to run:
```
./pull-and-build.sh
```
instead of `php pull.php` since the former both syncs and rebuilds the website
data.


Real Time Checkin Notifications
-------------------------------

This is only available for server setups.

After fully syncing your existing, historical data, you can turn on real time
checkin notifications. With real time notifications, Foursquare will make an
HTTP request to your server shortly after each new checkin. The data it sends
is not the full/long representation of your checkin, nor is it the
partial/short representation of your checkin discussed above. It's an even
smaller/tiny representation :)

Because of this tiny representation format, real time checkin notifications are
not super useful: it's simpler to just depend on the cron job you set up to
keep your data fresh.

There is one reason real time notifications are interesting: they always
contain the exact venue you checked in to.

The Foursquare superuser community will sometimes merge two venues if they are
likely duplicates. Sometimes that's helpful for your records, sometimes it is
not. When syncing your existing, historic data, Congregate has no access to the
original venue you checked in to: only the current, potentially merged or
otherwise altered venue that Foursquare knows about now. This is also an issue
(though a less likely one) for the cron syncs.

If you're interested in having a copy of the venue as it existed when you
checked in to it, real time notifications are the only way to get that data.

### Setup
1. Make sure the `client/checkins/` directory exists and is writable by your
   webserver.
2. Make sure the `client/checkins/pushed/` directory exists and is writable by
   your webserver.
3. Make sure `store/push/checkins` is a symlink to `client/checkins/pushed`.
4. Configure your webserver such that `client/receive.php` is publically
   accessible (no auth restrictions) at a URL of your choice (likely
   `https://wherever-your-congregate-site-is-hosted/receive.php`).
   You can test your URL by doing a normal GET request. A `405` response
   means it's set up *correctly*. Any other status code means something is
   wrong.
5. Go to your Foursquare Developer Project at
   https://foursquare.com/developers/home
6. In the project's settings, find the "Push API" section.
7. Update "Push Notifications" to "Push checkins by this project's users"
8. Use the push URL you opened up in step 3.
9. For "Push Version", enter the current date in the format requested (`YYYYMMDD`).
10. Click Save.
11. Click the "Open Push Console" link.
12. Sending a test push should fail since the fake user data it sends does not
    match the user account (yours) that Congregate expects.
13. Get your Foursquare User ID from `store/users/[YOUR_USER_ID].json`.
14. Enter that ID into the "Resend last push from user" field and click
    "Resend". The push should go through successfully.
15. Check your server's `client/checkins/pushed/`. You should see one file
    corresponding to the push you just triggered. (Note that Congregate stores
    checkins by their ID so pushing the "Resend" button multiple times will not
    produce multiple files in `client/checkins/pushed/`.)
16. If you want pushed checkins to get added immediately to the website's data
    (the alternative is just to wait for your continued sync process to pick up
    the changes), make sure your continued sync process leaves
    `client/checkins/checkins.geo.json` in a state that is writeable by the
    webserver. For example, if your continued sync process runs as user
    `checkins`, and the webserver runs as `www-data`, you'll probably want to:
    ```
    adduser checkins www-data
    ```
    and make sure your continued sync process runs:
    ```
    chgrp www-data ~/client/checkins/checkins.geo.json
    ```
    after each build.

If the above all checks out, your server should receive a similar push for each
new checkin of yours. The cron job is still important to fetch the full/long
representation of your checkins.


Commands
--------

### `php pull.php`

Fetches your data. Needs to be run several times when first setting up
Congregate to get all of your existing, historic data. Afterwards, should be
run occasionally to fetch your new data. (Though see also
`./pull-and-build.sh`.)

I recommend calling `php pull.php` without any arguments (except possibly the
`--type` argument when syncing your historical, existing data).

Arguments:
* `--all-shorts`: Resync all of your existing data for the quick partial/short
  representations only. The slow process for the full/long representations will
  not be rerun. Afterwards, only the full/long representations that are missing
  will be fetched. Can be useful if some old checkin was missed for whatever
  reason.
* `--no-overwrite-shorts`: When Congregate fetches short information for an
  object it already has (for example, when doing `lookback` fetches (see below)
  or when doing an `--all-shorts` fetch (see above)), it compares a normalized
  version of the existing object with a normalized version of the new object.
  If they are different, Congregate will overwrite the existing object with the
  new object. Use this argument to turn off that overwriting.
* `--lengthen-only`: Skip looking for new data and only "lengthen" data that
  has already been fetched. Lengthening is the that fetches the full/long
  representation of any checkins and venues that currently only have a
  partial/short representation.
* `--token=N`: Use the `N`th line (starting at `0`) of the `.access-token` file
  to access the Foursquare API. Advanced use only. (You can, in theory, use
  multiple Foursquare Developer Projects and one access token from each to
  speed up the fetching of your historical, existing data. It's usually not
  worth the hassle.)
* `--lookback=N`: When syncing, Congregate doesn't just fetch any new data it
  has not yet fetched, it also re-fetches the most recent `N` seconds of
  checkins. By default, `N` is `1209600`, which is two weeks. Congregate
  re-fetches the recent checkins to look for new comments, likes, shout
  updates, etc.
* `--type=TYPE`: Type is one of:
  * `users` - your user data,
  * `checkins` - your checkins,
  * `venues-liked` - the list of venues you've liked in Foursquare,
  * `venues-visited` - all the venues you've checked in to,
  * `photos` - all the photos you've posted to your checkins,
  * `curated-lists` - the lists of venues you've created or follow on
    Foursquare,
  * `tips` - your Foursquare tips, or
  * `tastes` - your Foursquare tastes.

  `--type=TYPE` can be used multiple times in one command:
  ```
  php pull.php --type=checkins --type=photos
  ```
* `--confirm-all-checkin-descendants`: Mostly useful when developing
  Congregate. This will loop through all known checkins and ensure Congregate
  has the venue and all photos associated with each checkin.


### `php build.php`

Looks at all the stored checkins, and builds a consolidated
`client/checkins/checkins.geo.json` file for use by the website.

When building, Congregate will first look for the full/long representations of
your checkins and fall back to the partial/short or push/tiny representations
if the full/long ones don't yet exist (i.e., if they have not yet been synced).

No arguments, though it will also read `./overrides.php`, which can be used to
override certain data for specific checkins. For example, if Foursquare has a
misspelled city name for a venue, your `overrides.php` file might look
something like
```php
<php

return [
	'52398749ca232809bfd13ea2' => [
		'location' => [
			'city' => 'Pasadena',
		],
	],
];
```

Note that the array in `overrides.php` is indexed by *checkin* ID not venue ID,
which can be annoying :)

Also note that Congregate uses an strange format for states. For countries for
which states have a canonical abbreviation (like the US, Canada, and Germany),
states look like:
```
'state' => [
	'id' => $abbreviation,
	'name' => $full_name,
]
```

But for other countries, states look like:
```
'state' => [
	'id' => $full_name,
	'name' => null,
]
```

The field in which the full name of the state is stored changes!


### `./pull-and-build.sh`

Combines `php pull.php` and `php build.php`. Accepts all arguments that
`php pull.php` accepts.


### `./pull-with-retry.sh`

A half-baked example of an `at`-based sync solution for the slow process of
fetching all historical, existing data. See Automated Sync above.


### `./local.sh`

Starts a simple and nonperformant local webserver so that you can view your
checkins in a local (non server) setup.


### `php fetch.php`

Fetches one object (checkin, venue, etc.) from the Foursquare API. Outputs the
result but does not store it.

```
php fetch.php TYPE ID
```

Arguments:
* `--token=N`: Advanced use only. See `php pull.php` arguments above.


### `./dayone-import.sh`

An in-progress experiment with exporting Congregate data to [Day One][3].

```
./dayone-import.sh FILE [...FILE]
```

Arguments:
* `--json-only`: Don't build the full ZIP with photos. Only output the JSON
  file.

[3]: https://dayoneapp.com/


Storage
-------

* `store/` : Partial/short representations of checkins, liked venues, visited
  venues, tips, and curated lists. Photo JSON files. The only representations
  of users and tastes.
* `store/full/`: Full/long representations of checkins, venues (both liked and
  visited), tips, and curated lists. Photo image files.
* `store/push/checkins -> client/checkins/pushed`: Pushed/tiny representations
  of any real time checkin notifications.
