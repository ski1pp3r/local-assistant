import React, { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock from '../UI/CodeBlock';

const MemoMessage = memo(function MemoMessage({ msg, index, isLast, streaming, speakingIdx, onSpeakMessage, fmtTime, t, precedingTools }) {
  const isToolOnly = msg.role === 'assistant' && /^<(SEARCH|FETCH)>[\s\S]*?<\/\1>$/.test(msg.content.trim());
  if (isToolOnly) return null;

  return (
    <div className={`msg ${msg.role}`}>
      {msg.role === 'assistant' ? (
        <>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock }}>
            {msg.content}
          </ReactMarkdown>
          {precedingTools.length > 0 && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {precedingTools.map((toolText, tIdx) => {
                const searchMatch = toolText.match(/<SEARCH>(.*?)<\/SEARCH>/);
                const fetchMatch = toolText.match(/<FETCH>(.*?)<\/FETCH>/);
                if (searchMatch) return <div key={tIdx} style={{ fontSize: '11px', color: '#888', fontStyle: 'italic' }}>[search] {searchMatch[1]}</div>;
                if (fetchMatch) return <div key={tIdx} style={{ fontSize: '11px', color: '#888', fontStyle: 'italic' }}>[fetch] {fetchMatch[1]}</div>;
                return null;
              })}
            </div>
          )}
        </>
      ) : msg.role === 'system' ? (
        msg.content.includes('[Neural Memory Updated]') ? (
          <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic', whiteSpace: 'pre-wrap', marginTop: '6px' }}>
            {msg.content}
          </div>
        ) : null
      ) : (
        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
      )}
      {streaming && msg.role === 'assistant' && isLast && (
        <span className="streaming-indicator" />
      )}
      <div className="msg-footer">
        <span className="timestamp">{fmtTime(msg.timestamp)}</span>
        {msg.role === 'assistant' && msg.content && !streaming && !isToolOnly && (
          <button
            className={`btn-speak ${speakingIdx === index ? 'speaking' : ''}`}
            onClick={() => onSpeakMessage(msg.content, index)}
            title={speakingIdx === index ? t('stop_tts') : t('speak_tts')}
          >
            {speakingIdx === index ? '•' : '›'}
          </button>
        )}
      </div>
    </div>
  );
});

export default memo(function MessageList({ 
  messages, 
  streaming, 
  speakingIdx, 
  onSpeakMessage, 
  fmtTime, 
  t, 
  messagesEndRef 
}) {
  // Pre-compute preceding tools for each message
  const messagesWithTools = useMemo(() => {
    return messages.map((msg, i) => {
      const precedingTools = [];
      if (msg.role === 'assistant') {
        let j = i - 1;
        while (j >= 0) {
          const prevMsg = messages[j];
          if (prevMsg.role === 'user') break;
          if (prevMsg.role === 'assistant') {
            if (/^<(SEARCH|FETCH)>[\s\S]*?<\/\1>$/.test(prevMsg.content.trim())) {
              precedingTools.unshift(prevMsg.content.trim());
            } else {
              break;
            }
          }
          j--;
        }
      }
      return { msg, precedingTools };
    });
  }, [messages]);

  return (
    <div className="messages">
      {messages.length === 0 && (
        <div className="empty-state">
          <div className="icon">⟩</div>
          <p>{t('awaiting_input')}</p>
        </div>
      )}
      {messagesWithTools.map(({ msg, precedingTools }, i) => (
        <MemoMessage
          key={i}
          msg={msg}
          index={i}
          isLast={i === messages.length - 1}
          streaming={streaming}
          speakingIdx={speakingIdx}
          onSpeakMessage={onSpeakMessage}
          fmtTime={fmtTime}
          t={t}
          precedingTools={precedingTools}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
});
