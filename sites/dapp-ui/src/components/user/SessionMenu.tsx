import { Avatar, Badge, CircularProgress, Menu } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import React, { useEffect, useState } from 'react';
import { useUserState } from '@/hooks/useUserState.ts';
import { StatusCard } from './StatusCard.tsx';
import { useSignalClient } from '@/hooks/useSignalClient.ts';

export function SessionMenu() {
  const state = useUserState();
  const { status, dataChannel } = useSignalClient();
  const hasDataChannel = !!dataChannel && dataChannel.readyState === 'open';
  const isConnected = status === 'connected';
  const [badgeColor, setBadgeColor] = useState<'error' | 'success' | 'warning'>(
    'error',
  );
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Update badge color based on connection status
  useEffect(() => {
    if (isConnected && hasDataChannel) {
      setBadgeColor('success');
    }
    if (isConnected && !hasDataChannel) {
      setBadgeColor('warning');
    }
  }, [dataChannel, isConnected]);

  return (
    <>
      <IconButton
        size="large"
        edge="start"
        color="inherit"
        aria-label="menu"
        onClick={handleClick}
      >
        <Badge variant="dot" color={badgeColor}>
          <Avatar alt="Liquid Auth" src="/logo-background.svg" />
        </Badge>
      </IconButton>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        sx={{
          top: -8,
          left: 8,
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        slotProps={{
          paper: { sx: { backgroundColor: 'transparent' } },
        }}
        MenuListProps={{
          'aria-labelledby': 'basic-button',
          sx: { padding: 0 },
        }}
      >
        {state.isLoading && <CircularProgress />}
        {state.isFetched && (
          <StatusCard
            socket={{ isConnected, hasDataChannel }}
            session={state.data.session}
            user={state.data.user}
          />
        )}
      </Menu>
    </>
  );
}
