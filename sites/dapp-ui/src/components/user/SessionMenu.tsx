import { Avatar, Badge, CircularProgress, Menu } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import React, { useState } from 'react';
import { useSocket } from '../../hooks/useSocket.ts';
import { useUserState } from './useUserState.ts';
import { StatusCard } from './StatusCard.tsx';

export function SessionMenu() {
  const state = useUserState();
  const { isConnected } = useSocket();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton
        size="large"
        edge="start"
        color="inherit"
        aria-label="menu"
        onClick={handleClick}
      >
        <Badge variant="dot" color={isConnected ? 'success' : 'error'}>
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
            socket={{ isConnected }}
            session={state.data.session}
            user={state.data.user}
          />
        )}
      </Menu>
    </>
  );
}
