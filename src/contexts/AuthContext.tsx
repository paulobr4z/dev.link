import { createContext, ReactNode, useEffect, useState } from "react";
import Router from "next/router";
import { setCookie, parseCookies, destroyCookie } from 'nookies';
import { api } from "../services/api";
import { AxiosError } from "axios";
import { IUser } from "../types/user";
import { getAccountByID } from "../services";

interface ICredential {
  email: string;
  password: string;
}

interface IAuthContext {
  signIn(credentials: ICredential): Promise<void>;
  signOut: () => void;
  user?: IUser;
  setUser: (user: IUser) => void;
  isAuthenticated: boolean;
}

interface IAuthProvider {
  children: ReactNode;
}

export const AuthContext = createContext({} as IAuthContext);

export function AuthProvider({ children }: IAuthProvider) {
  const [user, setUser] = useState<IUser>();
  const isAuthenticated = !!user;

  useEffect(() => {
    const { 'singlelink.userID': userID } = parseCookies();

    async function onGetUser() {
      const user = await getAccountByID(userID);
      setUser(user);
    }

    onGetUser();
  }, []);

  async function signIn({ email, password }: ICredential) {
    try {
      const response = await api.post('/login',{
        email,
        password
      });

      const { token, user } = response.data;

      const userID = user.id;

      setCookie(undefined, 'singlelink.token', token, {
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/'
      });

      setCookie(undefined, 'singlelink.userID', userID, {
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/'
      });

      api.defaults.headers['Authorization'] = `Bearer ${token}`;

      Router.push('/account');
      const account = await getAccountByID(userID)
      setUser(account);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.log(axiosError.response?.data);
    }
  }

  function signOut() {
    destroyCookie(undefined, 'singlelink.token')
  
    Router.push('/');  
  }

  return(
    <AuthContext.Provider value={{
      signIn,
      signOut,
      isAuthenticated,
      user,
      setUser
    }}>
      {children}
    </AuthContext.Provider>
  )
}