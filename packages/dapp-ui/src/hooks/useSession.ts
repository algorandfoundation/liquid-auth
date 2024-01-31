import { useQuery } from '@tanstack/react-query';

export function useSession(){
  return useQuery({ queryKey: ['session'], queryFn: ()=>{
      return fetch('/auth/session')
    }})
}
