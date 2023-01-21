FROM python:3.10

ENV PYTHONIOENCODING utf-8

RUN apt-get update && \
    apt-get -y install gcc libmariadb-dev && \
    apt-get -y install vim && \
    apt-get -y install cron && \
    apt-get clean

WORKDIR /opt/app

RUN pip install --upgrade pip

RUN pip install selenium

RUN pip install mysqlclient