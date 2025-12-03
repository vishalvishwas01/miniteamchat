
import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import MessageList from "../../components/chat/MessageList";
import MessageInput from "../../components/chat/MessageInput";
import { useDispatch } from "react-redux";
import { setCurrentChannel } from "../../redux/slices/channelsSlice";

export default function ChannelView() {
  const { id } = useParams();
  const dispatch = useDispatch();

  useEffect(() => {
    if (id) dispatch(setCurrentChannel(id));
  }, [id, dispatch]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        <MessageList channelId={id} />
      </div>

      <div className="p-4 border-t bg-white">
        <MessageInput channelId={id} />
      </div>
    </div>
  );
}
