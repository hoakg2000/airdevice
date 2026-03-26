### RUN Mobile-client success but can access on mobile with the same network
1. Make sure you are using https connect, it will warming you but you can toggle advance and choose access any way.
2. If you cannot access via 1, then you need to check if your firewall is blocking connect on this port or not


- try using ```New-NetFirewallRule -DisplayName "AirDevice Mobile Port" -Direction Inbound -LocalPort 5174 -Protocol TCP -Action Allow``` to allow firewall port for another connect (you should use your in-house network when using this)
(replace 5174 with your port)

- use ```try Remove-NetFirewallRule -DisplayName "AirDevice Mobile Port"``` to revert the firewall config
