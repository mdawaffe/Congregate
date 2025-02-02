#!/bin/bash

# Requires atrun to be turned on *and* given access.
# https://unix.stackexchange.com/a/478840
# 1. `sudo launchctl load -w /System/Library/LaunchDaemons/com.apple.atrun.plist`
# 2. Add `/usr/libexec/atrun` to apps with Full Disk Access
# 3. Add your user account to `/usr/lib/cron/at.allow` (see `man at`)
# The first run will require permission through a MacOS popup (unless Terminal.app has Full Disk Access as well).
# Recursive runs will not (since atrun has Full Disk Access).

php pull2.php "$@" | tee pull-with-retry.out
CODE=${PIPESTATUS[0]}

if [ 1 -eq $CODE ]; then
	# If there was a fatal, it's probably because we got some
	# bad response from the Foursquare API.
	# Retry once.
	for ARG in "$@"; do
		if [ "$ARG" == "--retried-after-exit-1" ]; then
			# We already retried once.
			exit 1
		fi
		# Retry
		"$0" "$@" --retried-after-exit-1
		exit $?
	done
elif [ 2 -eq $CODE ]; then
	AT_DATA=$( tail -n 2 pull-with-retry.out )
	TIME=$( echo "$AT_DATA" | head -n 1 )
	COMMAND=$( echo "$AT_DATA" | tail -n 1 )
	COMMAND=${COMMAND/"php pull2.php"/$0}
	# Exit code 2 is a "success", so forget the fact that we retried after a fatal.
	COMMAND=${COMMAND/"--retried-after-exit-1"/" "}
	# Rerun at the specified time.
	echo "$COMMAND" | at "$TIME"
	exit $CODE
fi
