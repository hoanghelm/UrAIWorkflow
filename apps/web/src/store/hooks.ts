import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";
import type { Dispatch, RootState } from ".";

export const useAppDispatch = () => useDispatch<Dispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
