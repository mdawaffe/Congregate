Congregate
==========

Swarm: _noun_ - a large, moving group.

Congregate uses the [Foursquare Personalization API][1] to download your Swarm
history.

This tool can be run as a script locally or run as a service on a server. In
the latter case, Congregate can receive real time checkin updates from Swarm
making its knowledge of your history "live".

In either case, you will need a Foursquare Developer Project (an OAuth app)
and an OAuth token. Congregate does not help create either of those :)

Sadly, this is not a click-and-you're-done tool :( Congregate takes some effort
to set up.

[1]: https://docs.foursquare.com/developer/reference/personalization-api-overview


Assumptions
-----------

Congregate makes some assumptions about your knowledge and experience. It
assumes you are:
* Comfortable on the command line,
* Have PHP installed on your machine or server, and
* For a server setup (as opposed to a local setep), know how to configure a web
  server.

If you don't meet any of those assumptions, you are probably a more interesting
person that I am :) Sadly, though, Congregate is not smart enough to help you.

<details>
<summary>

OAuth Setup
-----------

If you are familiar with the OAuth2 authentication flow, this process will be
annoying. If you are not familiar, it will be exasperating.

(Click for more details.)
</summary>

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

[2]: https://auth.website/oauth2/
</details>

Local Script vs. Server Hosted
------------------------------

Congregate can run locally on your machine or can be hosted on a server.

Local:
* Pro: Easier to set up.
* Pro: Your Foursquare/Swarm data never leaves your machine. Security!
* Con: Harder to view your data.
* Con: Cannot receive real time updates from Swarm.

Server Pros:
* Pro: Easy to view your data (once it's set up).
* Pro: Can optionally receive real time updates from Swarm.
* Con: Harder to set up
* Con: More things to go wrong.

### Local

* Clone this repo to your local machine.
* Go through the OAuth Setup above.
* Start the initial sync below.

Once the initial sync's first run has completed, you can run:
`./local.sh`
then go to `http://localhost:3333` and see most of the data for your checkins.

Continue to run the sync command (see below) to retrieve all of your checkins'
data.

### Server

* Clone this repo to your server.
* Go through the OAuth Setup above.
* Configure nginx, Apache, or your webserver of choice.
  * The docroot should be the `client/` directory of your clone of this repo.
  * If your server is publically accessible, ensure you have some sort of
    authentication layer. Basic Authentication (implemented in nginx with
    `auth_basic` and friends) is the simplest. Note that if you want real
    time checkin updates from Foursquare, you'll need to exclude
    `receive.php` (or whatever custom URL you choose) in the authentication
    configuration. See below for more information about real time updates.
  * Configure your webserver to gzip or otherwise compress the JSON files it
    servers. Congregate serves your checkin data as one (very) large JSON
    file. Without compression, some browsers will not cache the request, and
    viewing your data will be slow. In nginx, the following is a reasonable
    place to start:
    ```
    gzip on;
	gzip_min_length 1024;
	gzip_comp_level 9;
	gzip_types application/json;
	gzip_vary on;
	gzip_proxied any;
	```
* Start the initial sync below.

Once the initial sync's first run has completed, you'll need to build the
data for the website. (`./local.sh` above does this for local sites. For server
sites, we need to set it up separately.)

To build, run `php build.php`. That's it :)

Instead of running `php pull.php` (either manually, or in a cron job), you can
run `./pull-and-build.sh`, which will combine the syncing and building steps
for you.

Once the initial sync and build are done, you can see your checkins at whatever
URL you chose for your webserver.

Continue to run the sync command (see below) and the build step (see above) to
retrieve the full representation of all your current and future checkins.
You'll probably want to automate this with cron.


Run Congregate to Sync your Data
--------------------------------

Now that you have the required access token, Congregate can start making
requests to the Foursquare API to retrieve your checkins. Because of
Foursquare's API rate limiting, this make take a long time. Foursquare only
allows you to download ~500 checkins per hour.

In an ideal scenario where everything is fully automated, an account with
10,000 checkins will take nearly **24 hours** to sync.

### Manual Sync

Run `php pull.php` at most once an hour (really, about once every 65 minutes).

The first time you run `php pull.php`, it will take a while to run. During that
first sync, Congregate will _likely_ be able to download:
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

If you get any errors, it's probably because the Foursquare API glitched. Just
rerun `php pull.php` again and Congregate should be able to pick up where it
left off.

Note that that first sync only gets "some" of the data for venues and checkins.
This is just the way the Foursquare API works: a partial representation of your
venues and checkins is available reasonably quickly. A full representation
takes longer to retrieve not because it's large, but because of Foursquare's
API rate limits.

Because the first run is only able to get a partial representation of your
checkins and venues, you'll initially be able to see most of the data for your
checkins but not all. To get all of your data, keep running `php pull.php`
about once every 65 minutes until its done. (Obviously, you can run this less
often than that. More often, though, will not help.)

### Automated Sync

You're mostly on your own here :)

For local setups, I suggest using `at`. `pull-with-retry.sh` is a potentially
helpful script. Note the comments in that script about how `at` works on MacOS.

For server setups, I suggest using cron. For maximum sync speed, use something
like the example `crontab.fastest`. After the initial sync, you can use
a simpler crontab. E.g., a single hourly or daily entry.


Real Time Checkin Updates
-------------------------

This is only available for server setups.

After fully completing the initial sync, you can turn on real time checkin
updates. With real time updates, Foursquare will make an HTTP request to your
server shortly after each new checkin. The data it sends is not the full
representation of your checkin, nor is it the partial representation of your
checkin discussed above. It's an even smaller representation :)

Because of this tiny representation format, real time checkin updates are not
super useful: it's simpler to just depend on the cron job you set up to keep
your data fresh.

There is one reason real time updates are interesting: they always contain
the exact venue you checked in to.

The Foursquare superuser community will sometimes merge two venues if they are
likely duplicates. Sometimes that's helpful for your records, sometimes it is
not. The initial sync of historic data has no access to the original venue you
checked in to: only the current, potentially merged or otherwise altered venue
that Foursquare knows about now. This is also an issue (though a less likely
one) for the cron syncs.

If you're interested in having a copy of the venue as it existed when you
checked in to it, real time updates are the only way to get that data.

### Setup
1. Make sure `client/pushed-checkins` is writable by your webserver.
2. Make sure `store/push/checkins` is a symlink to `client/pushed-checkins`.
3. Configure your webserver such that `client/receive.php` is publically
   accessible (no auth restrictions) at a URL of your choice (likely
   `https://wherever-your-congregate-site-is-hosted/receive.php`).
   You can test your URL by doing a normal GET request. A `405` response
   means it's set up correctly. Any other error code means something is
   wrong.
4. Go to your Foursquare Developer Project at
   https://foursquare.com/developers/home
5. In the project's settings, find the "Push API" section.
6. Update "Push Notifications" to "Push checkins by this project's users"
7. Use the push URL you opened up in step 3.
8. For "Push Version", enter the current date in the format requested (`YYYYMMDD`).
9. Click Save.

You can now click the "Open Push Console" link.
* Sending a test push should fail since the fake user data it sends does not
  match the user account (yours) that Congregate expects.
* Get your Foursquare User ID from `store/users/[YOUR_USER_ID].json`.
* Enter that ID into the "Resend last push from user" field and click
  "Resend". The push should go through successfully.
* Check your server's `client/pushed-checkins/`. You should see one file
  corresponding to the push you just triggered. (Note that Congregation stores
  checkins by their ID so pushing the "Resend" button multiple times will not
  produce multiple files in `client/pushed-checkins/`.)

If the above all checks out, your server should receive a similar push for each
new checkin of yours. The cron job is still important to fetch the full
representation of your checkins.
